package postgres

import (
	"errors"
	"math/rand"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/gorm"
)

const letterBytes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateRandomInviteCode(n int) string {
	b := make([]byte, n)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = letterBytes[rng.Intn(len(letterBytes))]
	}
	return string(b)
}

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

func (r *workspaceGormRepository) ListMembers(workspaceID string) ([]domain.WorkspaceMember, error) {
	var members []domain.WorkspaceMember
	err := r.db.Preload("User").Where("workspace_id = ?", workspaceID).Find(&members).Error
	return members, err
}

func (r *workspaceGormRepository) CreateDMChannel(dm *domain.DMChannel) error {
	return r.db.Create(dm).Error
}

func (r *workspaceGormRepository) GetDMChannel(workspaceID, userOneID, userTwoID string) (*domain.DMChannel, error) {
	var dm domain.DMChannel
	err := r.db.Where("workspace_id = ? AND ((user_one_id = ? AND user_two_id = ?) OR (user_one_id = ? AND user_two_id = ?))",
		workspaceID, userOneID, userTwoID, userTwoID, userOneID).
		First(&dm).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &dm, nil
}

func (r *workspaceGormRepository) GetDMChannelByID(id string) (*domain.DMChannel, error) {
	var dm domain.DMChannel
	err := r.db.Preload("UserOne").Preload("UserTwo").Where("id = ?", id).First(&dm).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &dm, nil
}

func (r *workspaceGormRepository) ListDMChannelsForUser(workspaceID, userID string) ([]domain.DMChannel, error) {
	var dms []domain.DMChannel
	err := r.db.Preload("UserOne").Preload("UserTwo").
		Where("workspace_id = ? AND (user_one_id = ? OR user_two_id = ?)", workspaceID, userID, userID).
		Order("created_at desc").
		Find(&dms).Error
	return dms, err
}

func (r *workspaceGormRepository) Update(workspace *domain.Workspace) error {
	return r.db.Save(workspace).Error
}

func (r *workspaceGormRepository) Delete(id string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		// Delete workspace members
		if err := tx.Where("workspace_id = ?", id).Delete(&domain.WorkspaceMember{}).Error; err != nil {
			return err
		}
		// Delete channels
		if err := tx.Where("workspace_id = ?", id).Delete(&domain.Channel{}).Error; err != nil {
			return err
		}
		// Delete DM channels
		if err := tx.Where("workspace_id = ?", id).Delete(&domain.DMChannel{}).Error; err != nil {
			return err
		}
		// Delete workspace itself
		return tx.Where("id = ?", id).Delete(&domain.Workspace{}).Error
	})
}

func (r *workspaceGormRepository) GetByInviteCode(code string) (*domain.Workspace, error) {
	var workspace domain.Workspace
	err := r.db.Where("invite_code = ?", code).First(&workspace).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &workspace, nil
}

func (r *workspaceGormRepository) UpdateMemberRole(workspaceID, userID, role string) error {
	return r.db.Model(&domain.WorkspaceMember{}).
		Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Update("role", role).Error
}

func (r *workspaceGormRepository) RemoveMember(workspaceID, userID string) error {
	return r.db.Where("workspace_id = ? AND user_id = ?", workspaceID, userID).
		Delete(&domain.WorkspaceMember{}).Error
}
