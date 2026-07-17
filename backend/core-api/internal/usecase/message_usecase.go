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

	if channel != nil {
		// 2. Check if user is a member of the workspace
		member, err := u.workspaceRepo.GetMember(channel.WorkspaceID, userID)
		if err != nil {
			return nil, err
		}
		if member == nil {
			return nil, errors.New("access denied: you are not a member of this workspace")
		}

		// Check private channel membership
		if channel.IsPrivate {
			isChanMember, err := u.channelRepo.IsMember(channelID, userID)
			if err != nil {
				return nil, err
			}
			if !isChanMember {
				return nil, errors.New("access denied: you are not a member of this private channel")
			}
		}
	} else {
		// 3. Try to get DM Channel
		dmChannel, err := u.workspaceRepo.GetDMChannelByID(channelID)
		if err != nil {
			return nil, err
		}
		if dmChannel == nil {
			return nil, errors.New("channel not found")
		}

		// Check if user is participant of DM
		if dmChannel.UserOneID != userID && dmChannel.UserTwoID != userID {
			return nil, errors.New("access denied: you are not a participant of this direct message channel")
		}
	}

	// 4. Set limit constraints
	if limit <= 0 {
		limit = 50
	} else if limit > 100 {
		limit = 100
	}

	// 5. Fetch messages from ScyllaDB
	return u.messageRepo.GetByChannel(channelID, limit, before)
}
