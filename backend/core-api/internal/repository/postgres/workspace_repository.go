package postgres

import (
	"errors"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/gorm"
)

type workspaceGormRepository struct {
	db *gorm.DB
}

func NewWorkspaceRepository(db *gorm.DB) domain.WorkspaceRepository {
	return &workspaceGormRepository{db: db}
}

func (r *workspaceGormRepository) Create(workspace *domain.Workspace) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(workspace).Error; err != nil {
			return err
		}

		// Auto add owner as a member with 'owner' role
		member := &domain.WorkspaceMember{
			WorkspaceID: workspace.ID,
			UserID:      workspace.OwnerID,
			Role:        "owner",
			JoinedAt:    time.Now(),
		}
		return tx.Create(member).Error
	})
}

func (r *workspaceGormRepository) GetByID(id string) (*domain.Workspace, error) {
	var workspace domain.Workspace
	err := r.db.Where("id = ?", id).First(&workspace).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &workspace, nil
}

func (r *workspaceGormRepository) ListForUser(userID string) ([]domain.Workspace, error) {
	var workspaces []domain.Workspace
	err := r.db.
		Table("workspaces").
		Joins("join workspace_members on workspace_members.workspace_id = workspaces.id").
		Where("workspace_members.user_id = ?", userID).
		Find(&workspaces).Error
	return workspaces, err
}

func (r *workspaceGormRepository) AddMember(member *domain.WorkspaceMember) error {
	return r.db.Create(member).Error
}

func (r *workspaceGormRepository) GetMember(workspaceID, userID string) (*domain.WorkspaceMember, error) {
	var member domain.WorkspaceMember
	err := r.db.Where("workspace_id = ? and user_id = ?", workspaceID, userID).First(&member).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &member, nil
}
