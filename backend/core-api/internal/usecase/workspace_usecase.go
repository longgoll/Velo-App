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
