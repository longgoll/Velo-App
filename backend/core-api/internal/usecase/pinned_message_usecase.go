package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/redis/go-redis/v9"
)

type PinnedMessageUseCase struct {
	repo        domain.PinnedMessageRepository
	redisClient *redis.Client
}

func NewPinnedMessageUseCase(repo domain.PinnedMessageRepository, redisClient *redis.Client) *PinnedMessageUseCase {
	return &PinnedMessageUseCase{
		repo:        repo,
		redisClient: redisClient,
	}
}

func (uc *PinnedMessageUseCase) Pin(userID, channelID, messageID, content, username string) (*domain.PinnedMessage, error) {
	// Prevent duplicate pins
	already, err := uc.repo.IsAlreadyPinned(channelID, messageID)
	if err != nil {
		return nil, err
	}
	if already {
		return nil, errors.New("tin nhắn này đã được ghim")
	}

	pin := &domain.PinnedMessage{
		ChannelID: channelID,
		MessageID: messageID,
		PinnedBy:  userID,
		Content:   content,
		Username:  username,
	}
	if err := uc.repo.Pin(pin); err != nil {
		return nil, err
	}

	// Broadcast real-time update
	pubMsg := map[string]interface{}{
		"id":         messageID,
		"channel_id": channelID,
		"user_id":    userID,
		"username":   username,
		"content":    content,
		"timestamp":  0,
		"type":       "pin",
	}
	payload, err := json.Marshal(pubMsg)
	if err == nil {
		pubsubKey := fmt.Sprintf("chat:%s", channelID)
		if err := uc.redisClient.Publish(context.Background(), pubsubKey, payload).Err(); err != nil {
			log.Printf("PinnedMessageUseCase Pin: Failed to publish message update: %v", err)
		}
	}

	return pin, nil
}

func (uc *PinnedMessageUseCase) Unpin(userID, channelID, pinID string) error {
	if err := uc.repo.Unpin(channelID, pinID); err != nil {
		return err
	}

	// Broadcast real-time update
	pubMsg := map[string]interface{}{
		"id":         pinID,
		"channel_id": channelID,
		"user_id":    userID,
		"username":   "system",
		"content":    "unpinned",
		"timestamp":  0,
		"type":       "unpin",
	}
	payload, err := json.Marshal(pubMsg)
	if err == nil {
		pubsubKey := fmt.Sprintf("chat:%s", channelID)
		if err := uc.redisClient.Publish(context.Background(), pubsubKey, payload).Err(); err != nil {
			log.Printf("PinnedMessageUseCase Unpin: Failed to publish message update: %v", err)
		}
	}

	return nil
}

func (uc *PinnedMessageUseCase) ListByChannel(userID, channelID string) ([]domain.PinnedMessage, error) {
	return uc.repo.ListByChannel(channelID)
}

