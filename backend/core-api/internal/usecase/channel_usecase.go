package usecase

import (
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type channelUseCase struct {
	channelRepo   domain.ChannelRepository
	workspaceRepo domain.WorkspaceRepository
}

func NewChannelUseCase(channelRepo domain.ChannelRepository, workspaceRepo domain.WorkspaceRepository) domain.ChannelUseCase {
	return &channelUseCase{
		channelRepo:   channelRepo,
		workspaceRepo: workspaceRepo,
	}
}

func (u *channelUseCase) Create(userID string, workspaceID string, req *domain.CreateChannelReq) (*domain.Channel, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	// Verify permissions (admin or owner can create channels)
	if member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("only workspace owner or admin can create channels")
	}

	if req.Name == "" {
		return nil, errors.New("channel name is required")
	}

	if req.Type != domain.ChannelTypeText && req.Type != domain.ChannelTypeVoice {
		req.Type = domain.ChannelTypeText
	}

	channel := &domain.Channel{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Type:        req.Type,
	}

	err = u.channelRepo.Create(channel)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (u *channelUseCase) List(userID string, workspaceID string) ([]domain.Channel, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	return u.channelRepo.ListForWorkspace(workspaceID)
}

func (u *channelUseCase) GetByID(channelID string) (*domain.Channel, error) {
	return u.channelRepo.GetByID(channelID)
}
