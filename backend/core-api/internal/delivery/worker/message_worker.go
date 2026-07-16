package worker

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/redis/go-redis/v9"
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
}

func NewMessageWorker(redisClient *redis.Client, messageRepo domain.MessageRepository) *MessageWorker {
	return &MessageWorker{
		redisClient: redisClient,
		messageRepo: messageRepo,
	}
}

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
			
			if err := w.messageRepo.Save(dbMsg); err != nil {
				log.Printf("Error saving message to ScyllaDB: %v", err)
			} else {
				log.Printf("Successfully saved message %s from user %s in channel %s to ScyllaDB", dbMsg.ID, dbMsg.Username, dbMsg.ChannelID)
			}
		}
	}()
}
