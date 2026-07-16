package main

import (
	"fmt"
	"log"
	"net"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/hoanglong/chat/backend/core-api/config"
	httpDelivery "github.com/hoanglong/chat/backend/core-api/internal/delivery/http"
	"github.com/hoanglong/chat/backend/core-api/internal/repository/postgres"
	"github.com/hoanglong/chat/backend/core-api/internal/usecase"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"

	// gRPC imports
	grpcDelivery "github.com/hoanglong/chat/backend/core-api/internal/delivery/grpc"
	pbAuth "github.com/hoanglong/chat/backend/core-api/pkg/pb/auth"
	pbGateway "github.com/hoanglong/chat/backend/core-api/pkg/pb/gateway"
	"google.golang.org/grpc"
)

func main() {
	// 1. Load config
	cfg := config.LoadConfig()

	// 2. Initialize database
	db := postgres.InitDB(cfg)

	// 3. Initialize Token Maker (PASETO)
	tokenMaker, err := token.NewPasetoMaker(cfg.PasetoSymmetricKey)
	if err != nil {
		log.Fatalf("Failed to create token maker: %v", err)
	}

	// 4. Initialize Repositories
	userRepo := postgres.NewUserRepository(db)
	workspaceRepo := postgres.NewWorkspaceRepository(db)
	channelRepo := postgres.NewChannelRepository(db)

	// 5. Initialize UseCases
	userUseCase := usecase.NewUserUseCase(userRepo, tokenMaker)
	workspaceUseCase := usecase.NewWorkspaceUseCase(workspaceRepo)
	channelUseCase := usecase.NewChannelUseCase(channelRepo, workspaceRepo)

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

	// Health Check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status": "healthy",
		})
	})

	log.Printf("Starting REST HTTP Server on port %s...", cfg.Port)
	log.Fatal(app.Listen(fmt.Sprintf(":%s", cfg.Port)))
}
