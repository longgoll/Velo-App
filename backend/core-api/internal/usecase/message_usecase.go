package usecase

import (
	"errors"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type messageUseCase struct {
	messageRepo   domain.MessageRepository
	channelRepo   domain.ChannelRepository
	workspaceRepo domain.WorkspaceRepository
}

func NewMessageUseCase(
	messageRepo domain.MessageRepository,
	channelRepo domain.ChannelRepository,
	workspaceRepo domain.WorkspaceRepository,
) domain.MessageUseCase {
	return &messageUseCase{
		messageRepo:   messageRepo,
		channelRepo:   channelRepo,
		workspaceRepo: workspaceRepo,
	}
}

func (u *messageUseCase) GetHistory(userID string, channelID string, limit int, before time.Time) ([]*domain.Message, error) {
	// 1. Get channel to find the Workspace ID
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return nil, err
	}
	if channel == nil {
		return nil, errors.New("channel not found")
	}

	// 2. Check if user is a member of the workspace
	member, err := u.workspaceRepo.GetMember(channel.WorkspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	// 3. Set limit constraints
	if limit <= 0 {
		limit = 50
	} else if limit > 100 {
		limit = 100
	}

	// 4. Fetch messages from ScyllaDB
	return u.messageRepo.GetByChannel(channelID, limit, before)
}
