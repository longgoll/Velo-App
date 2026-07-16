package usecase

import (
	"errors"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type workspaceUseCase struct {
	workspaceRepo domain.WorkspaceRepository
}

func NewWorkspaceUseCase(workspaceRepo domain.WorkspaceRepository) domain.WorkspaceUseCase {
	return &workspaceUseCase{workspaceRepo: workspaceRepo}
}

func (u *workspaceUseCase) Create(userID string, req *domain.CreateWorkspaceReq) (*domain.Workspace, error) {
	if req.Name == "" {
		return nil, errors.New("workspace name is required")
	}

	workspace := &domain.Workspace{
		Name:    req.Name,
		OwnerID: userID,
	}

	err := u.workspaceRepo.Create(workspace)
	if err != nil {
		return nil, err
	}

	return workspace, nil
}

func (u *workspaceUseCase) List(userID string) ([]domain.Workspace, error) {
	return u.workspaceRepo.ListForUser(userID)
}

func (u *workspaceUseCase) GetByID(workspaceID string) (*domain.Workspace, error) {
	return u.workspaceRepo.GetByID(workspaceID)
}

func (u *workspaceUseCase) Join(userID string, workspaceID string) error {
	// Check if workspace exists
	ws, err := u.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return err
	}
	if ws == nil {
		return errors.New("workspace not found")
	}

	// Check if already a member
	existingMember, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if existingMember != nil {
		return errors.New("user is already a member of this workspace")
	}

	member := &domain.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        "member",
		JoinedAt:    time.Now(),
	}

	return u.workspaceRepo.AddMember(member)
}

func (u *workspaceUseCase) GetMember(workspaceID, userID string) (*domain.WorkspaceMember, error) {
	return u.workspaceRepo.GetMember(workspaceID, userID)
}

func (u *workspaceUseCase) ListMembers(userID string, workspaceID string) ([]domain.WorkspaceMember, error) {
	// Check if user is a member of the workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	return u.workspaceRepo.ListMembers(workspaceID)
}

func (u *workspaceUseCase) GetOrCreateDMChannel(userID string, workspaceID string, recipientID string) (*domain.DMChannel, error) {
	// Check if user is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	// Check if recipient is member of workspace
	recipientMember, err := u.workspaceRepo.GetMember(workspaceID, recipientID)
	if err != nil {
		return nil, err
	}
	if recipientMember == nil {
		return nil, errors.New("recipient is not a member of this workspace")
	}

	// Retrieve if exists
	existing, err := u.workspaceRepo.GetDMChannel(workspaceID, userID, recipientID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return u.workspaceRepo.GetDMChannelByID(existing.ID)
	}

	// Create new DM channel
	dm := &domain.DMChannel{
		WorkspaceID: workspaceID,
		UserOneID:   userID,
		UserTwoID:   recipientID,
	}

	err = u.workspaceRepo.CreateDMChannel(dm)
	if err != nil {
		return nil, err
	}

	return u.workspaceRepo.GetDMChannelByID(dm.ID)
}

func (u *workspaceUseCase) GetDMChannelByID(id string) (*domain.DMChannel, error) {
	return u.workspaceRepo.GetDMChannelByID(id)
}

func (u *workspaceUseCase) ListDMChannels(userID string, workspaceID string) ([]domain.DMChannel, error) {
	// Check if user is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	return u.workspaceRepo.ListDMChannelsForUser(workspaceID, userID)
}
