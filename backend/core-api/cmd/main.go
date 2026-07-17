package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/url"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/hoanglong/chat/backend/core-api/config"
	httpDelivery "github.com/hoanglong/chat/backend/core-api/internal/delivery/http"
	"github.com/hoanglong/chat/backend/core-api/internal/repository/postgres"
	"github.com/hoanglong/chat/backend/core-api/internal/repository/scylla"
	"github.com/hoanglong/chat/backend/core-api/internal/usecase"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/redis/go-redis/v9"

	// gRPC imports
	grpcDelivery "github.com/hoanglong/chat/backend/core-api/internal/delivery/grpc"
	"github.com/hoanglong/chat/backend/core-api/internal/delivery/worker"
	pbAuth "github.com/hoanglong/chat/backend/core-api/pkg/pb/auth"
	pbGateway "github.com/hoanglong/chat/backend/core-api/pkg/pb/gateway"
	"google.golang.org/grpc"
)

func main() {
	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Initialize database
	db := postgres.InitDB(cfg)

	// 2.5. Initialize ScyllaDB
	scyllaSession := scylla.InitScyllaDB(cfg)
	defer scyllaSession.Close()

	// 2.6. Initialize Redis/Valkey client
	redisClient := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", cfg.ValkeyHost, cfg.ValkeyPort),
	})
	defer redisClient.Close()

	// 2.7. Initialize SeaweedFS S3 Client (using MinIO SDK)
	minioHost, minioSSL := parseMinioEndpoint(cfg.SeaweedfsS3Endpoint)
	minioClient, err := minio.New(minioHost, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.SeaweedfsAccessKey, cfg.SeaweedfsSecretKey, ""),
		Secure: minioSSL,
	})
	if err != nil {
		log.Fatalf("Failed to initialize MinIO client for SeaweedFS: %v", err)
	}

	// Auto-create SeaweedFS S3 bucket
	ctx := context.Background()
	exists, err := minioClient.BucketExists(ctx, cfg.SeaweedfsBucket)
	if err != nil {
		log.Printf("Warning: Failed to check bucket existence: %v", err)
	} else if !exists {
		err = minioClient.MakeBucket(ctx, cfg.SeaweedfsBucket, minio.MakeBucketOptions{})
		if err != nil {
			log.Printf("Warning: Failed to create bucket %s: %v", cfg.SeaweedfsBucket, err)
		} else {
			log.Printf("Successfully created SeaweedFS bucket: %s", cfg.SeaweedfsBucket)
		}
	} else {
		log.Printf("SeaweedFS bucket %s already exists", cfg.SeaweedfsBucket)
	}

	// 3. Initialize Token Maker (PASETO)
	tokenMaker, err := token.NewPasetoMaker(cfg.PasetoSymmetricKey)
	if err != nil {
		log.Fatalf("Failed to create token maker: %v", err)
	}

	// 4. Initialize Repositories
	userRepo := postgres.NewUserRepository(db)
	workspaceRepo := postgres.NewWorkspaceRepository(db)
	channelRepo := postgres.NewChannelRepository(db)
	messageRepo := scylla.NewMessageRepository(scyllaSession)
	notificationRepo := postgres.NewNotificationRepository(db)
	pinnedMessageRepo := postgres.NewPinnedMessageRepository(db)

	// 5. Initialize UseCases
	userUseCase := usecase.NewUserUseCase(userRepo, tokenMaker)
	workspaceUseCase := usecase.NewWorkspaceUseCase(workspaceRepo)
	channelUseCase := usecase.NewChannelUseCase(channelRepo, workspaceRepo, cfg.LiveKitURL, cfg.LiveKitApiKey, cfg.LiveKitApiSecret)
	messageUseCase := usecase.NewMessageUseCase(messageRepo, channelRepo, workspaceRepo, db, redisClient)
	attachmentUseCase := usecase.NewAttachmentUseCase(minioClient, cfg.SeaweedfsBucket, cfg.SeaweedfsS3Endpoint)
	notificationUseCase := usecase.NewNotificationUseCase(notificationRepo)
	pinnedMessageUseCase := usecase.NewPinnedMessageUseCase(pinnedMessageRepo)

	// 5.5. Start Background Message Worker
	msgWorker := worker.NewMessageWorker(db, redisClient, messageRepo, minioClient, cfg.SeaweedfsBucket, cfg.SeaweedfsS3Endpoint)
	msgWorker.Start(context.Background())

	// 6. Start gRPC Server in background
	grpcListener, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GrpcPort))
	if err != nil {
		log.Fatalf("Failed to listen on gRPC port: %v", err)
	}

	grpcServer := grpc.NewServer()
	authGrpcServer := grpcDelivery.NewAuthServer(tokenMaker)
	gatewayGrpcServer := grpcDelivery.NewGatewayServer(workspaceUseCase, channelUseCase)

	pbAuth.RegisterAuthServiceServer(grpcServer, authGrpcServer)
	pbGateway.RegisterGatewayServiceServer(grpcServer, gatewayGrpcServer)

	go func() {
		log.Printf("Starting gRPC Server on port %s...", cfg.GrpcPort)
		if err := grpcServer.Serve(grpcListener); err != nil {
			log.Fatalf("Failed to serve gRPC: %v", err)
		}
	}()

	// 7. Start REST HTTP Server (Fiber)
	app := fiber.New(fiber.Config{
		AppName: "Next-Gen Chat Core API",
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
	}))

	// API route groups
	api := app.Group("/api")

	// Middleware
	authMiddleware := httpDelivery.NewAuthMiddleware(tokenMaker)

	// Register Handlers
	httpDelivery.NewUserHandler(api, userUseCase)
	httpDelivery.NewWorkspaceHandler(api, authMiddleware, workspaceUseCase)
	httpDelivery.NewChannelHandler(api, authMiddleware, channelUseCase)
	httpDelivery.NewMessageHandler(api, authMiddleware, messageUseCase)
	httpDelivery.NewAttachmentHandler(api, authMiddleware, attachmentUseCase)
	httpDelivery.NewNotificationHandler(api, authMiddleware, notificationUseCase)
	httpDelivery.NewPinnedMessageHandler(api, authMiddleware, pinnedMessageUseCase)

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
		})
	})

	log.Printf("Starting REST HTTP Server on port %s...", cfg.Port)
	log.Fatal(app.Listen(fmt.Sprintf(":%s", cfg.Port)))
}

// Helper to parse endpoint URL to host for MinIO
func parseMinioEndpoint(rawURL string) (string, bool) {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "localhost:8333", false
	}
	host := u.Host
	useSSL := u.Scheme == "https"
	return host, useSSL
}
