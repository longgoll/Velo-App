package usecase

import (
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type PinnedMessageUseCase struct {
	repo domain.PinnedMessageRepository
}

func NewPinnedMessageUseCase(repo domain.PinnedMessageRepository) *PinnedMessageUseCase {
	return &PinnedMessageUseCase{repo: repo}
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
	return pin, nil
}

func (uc *PinnedMessageUseCase) Unpin(userID, channelID, pinID string) error {
	return uc.repo.Unpin(channelID, pinID)
}

func (uc *PinnedMessageUseCase) ListByChannel(userID, channelID string) ([]domain.PinnedMessage, error) {
	return uc.repo.ListByChannel(channelID)
}
