package worker

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"image/jpeg"
	_ "image/jpeg"
	_ "image/png"
	"log"
	"net/url"
	"regexp"
	"strings"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/minio/minio-go/v7"
	"github.com/redis/go-redis/v9"
	"golang.org/x/image/draw"
)

type queueMessage struct {
	ID        string `json:"id"`
	ChannelID string `json:"channel_id"`
	UserID    string `json:"user_id"`
	Username  string `json:"username"`
	Content   string `json:"content"`
	Timestamp int64  `json:"timestamp"`
}

type MessageWorker struct {
	redisClient *redis.Client
	messageRepo domain.MessageRepository
	minioClient *minio.Client
	bucketName  string
	s3Endpoint  string
}

func NewMessageWorker(
	redisClient *redis.Client,
	messageRepo domain.MessageRepository,
	minioClient *minio.Client,
	bucketName string,
	s3Endpoint string,
) *MessageWorker {
	return &MessageWorker{
		redisClient: redisClient,
		messageRepo: messageRepo,
		minioClient: minioClient,
		bucketName:  bucketName,
		s3Endpoint:  s3Endpoint,
	}
}

// Regex to capture image upload format: [image:filename:url]
// Prevents infinite loop by ensuring it does not already contain a third field (thumbnail)
var imageMsgRegex = regexp.MustCompile(`^\[image:([^:]+):([^:\]]+)\]$`)

func (w *MessageWorker) Start(ctx context.Context) {
	pubsub := w.redisClient.PSubscribe(ctx, "chat:*")

	go func() {
		defer pubsub.Close()
		log.Println("MessageWorker started listening to Valkey pattern 'chat:*'")

		ch := pubsub.Channel()
		for msg := range ch {
			var qMsg queueMessage
			if err := json.Unmarshal([]byte(msg.Payload), &qMsg); err != nil {
				log.Printf("Error unmarshalling queue message: %v", err)
				continue
			}

			dbMsg := &domain.Message{
				ID:        qMsg.ID,
				ChannelID: qMsg.ChannelID,
				UserID:    qMsg.UserID,
				Username:  qMsg.Username,
				Content:   qMsg.Content,
				Timestamp: time.UnixMilli(qMsg.Timestamp),
			}

			// Save to ScyllaDB
			if err := w.messageRepo.Save(dbMsg); err != nil {
				log.Printf("Error saving message to ScyllaDB: %v", err)
				continue
			}
			log.Printf("Successfully saved message %s from user %s in channel %s to ScyllaDB", dbMsg.ID, dbMsg.Username, dbMsg.ChannelID)

			// Check if message is an image to run async optimization and thumbnail processing
			if matches := imageMsgRegex.FindStringSubmatch(dbMsg.Content); len(matches) == 3 {
				fileName := matches[1]
				originalURL := matches[2]
				
				// Process image in the background
				go w.processImageAttachment(context.Background(), dbMsg, fileName, originalURL)
			}
		}
	}()
}

func (w *MessageWorker) processImageAttachment(ctx context.Context, dbMsg *domain.Message, fileName, originalURL string) {
	log.Printf("Background worker: Processing image attachment for message %s (file: %s)", dbMsg.ID, fileName)

	// 1. Extract object key from URL
	objectKey := extractObjectKey(originalURL, w.bucketName)
	if objectKey == "" {
		log.Printf("Background worker: Could not extract object key from URL: %s", originalURL)
		return
	}

	// 2. Download original image
	object, err := w.minioClient.GetObject(ctx, w.bucketName, objectKey, minio.GetObjectOptions{})
	if err != nil {
		log.Printf("Background worker: Failed to download image %s: %v", objectKey, err)
		return
	}
	defer object.Close()

	// 3. Decode image
	img, _, err := image.Decode(object)
	if err != nil {
		log.Printf("Background worker: Failed to decode image: %v", err)
		return
	}

	// 4. Generate compressed image (max width 1200px) and thumbnail (max width 300px)
	compressedImg := resizeImage(img, 1200)
	thumbImg := resizeImage(img, 300)

	// 5. Encode images to JPEG
	var compressedBuf bytes.Buffer
	if err := jpeg.Encode(&compressedBuf, compressedImg, &jpeg.Options{Quality: 80}); err != nil {
		log.Printf("Background worker: Failed to encode compressed image: %v", err)
		return
	}

	var thumbBuf bytes.Buffer
	if err := jpeg.Encode(&thumbBuf, thumbImg, &jpeg.Options{Quality: 70}); err != nil {
		log.Printf("Background worker: Failed to encode thumbnail image: %v", err)
		return
	}

	// 6. Upload compressed image back to original key (overwriting original raw file)
	_, err = w.minioClient.PutObject(ctx, w.bucketName, objectKey, &compressedBuf, int64(compressedBuf.Len()), minio.PutObjectOptions{
		ContentType: "image/jpeg",
	})
	if err != nil {
		log.Printf("Background worker: Failed to upload compressed image: %v", err)
		return
	}

	// 7. Upload thumbnail image to a suffix key
	thumbKey := objectKey + "-thumb"
	_, err = w.minioClient.PutObject(ctx, w.bucketName, thumbKey, &thumbBuf, int64(thumbBuf.Len()), minio.PutObjectOptions{
		ContentType: "image/jpeg",
	})
	if err != nil {
		log.Printf("Background worker: Failed to upload thumbnail: %v", err)
		return
	}

	// 8. Update database record with thumbnail URL
	endpoint := strings.TrimSuffix(w.s3Endpoint, "/")
	thumbURL := fmt.Sprintf("%s/%s/%s", endpoint, w.bucketName, thumbKey)
	newContent := fmt.Sprintf("[image:%s:%s:%s]", fileName, originalURL, thumbURL)

	dbMsg.Content = newContent
	if err := w.messageRepo.Save(dbMsg); err != nil {
		log.Printf("Background worker: Failed to save updated message to ScyllaDB: %v", err)
		return
	}

	// 9. Broadcast updated message over Valkey Pub/Sub to notify online clients
	pubMsg := queueMessage{
		ID:        dbMsg.ID,
		ChannelID: dbMsg.ChannelID,
		UserID:    dbMsg.UserID,
		Username:  dbMsg.Username,
		Content:   dbMsg.Content,
		Timestamp: dbMsg.Timestamp.UnixMilli(),
	}
	payload, err := json.Marshal(pubMsg)
	if err != nil {
		return
	}

	pubsubKey := fmt.Sprintf("chat:%s", dbMsg.ChannelID)
	if err := w.redisClient.Publish(ctx, pubsubKey, payload).Err(); err != nil {
		log.Printf("Background worker: Failed to publish updated message to Valkey: %v", err)
	} else {
		log.Printf("Background worker: Successfully processed and broadcasted updated message %s", dbMsg.ID)
	}
}

// Helper to extract the object key from the SeaweedFS URL
func extractObjectKey(rawURL, bucketName string) string {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return ""
	}
	path := parsed.Path
	prefix := "/" + bucketName + "/"
	if strings.HasPrefix(path, prefix) {
		return strings.TrimPrefix(path, prefix)
	}
	return ""
}

// Helper to resize image using high quality CatmullRom scaler
func resizeImage(src image.Image, maxWidth int) image.Image {
	bounds := src.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()

	if width <= maxWidth {
		return src
	}

	newWidth := maxWidth
	newHeight := (height * maxWidth) / width

	dst := image.NewRGBA(image.Rect(0, 0, newWidth, newHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, bounds, draw.Over, nil)
	return dst
}
