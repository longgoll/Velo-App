package postgres

import (
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/gorm"
)

type channelGormRepository struct {
	db *gorm.DB
}

func NewChannelRepository(db *gorm.DB) domain.ChannelRepository {
	return &channelGormRepository{db: db}
}

func (r *channelGormRepository) Create(channel *domain.Channel) error {
	return r.db.Create(channel).Error
}

func (r *channelGormRepository) GetByID(id string) (*domain.Channel, error) {
	var channel domain.Channel
	err := r.db.Where("id = ?", id).First(&channel).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &channel, nil
}

func (r *channelGormRepository) ListForWorkspace(workspaceID string) ([]domain.Channel, error) {
	var channels []domain.Channel
	err := r.db.Where("workspace_id = ?", workspaceID).Order("created_at asc").Find(&channels).Error
	return channels, err
}

func (r *channelGormRepository) Update(channel *domain.Channel) error {
	return r.db.Save(channel).Error
}

func (r *channelGormRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&domain.Channel{}).Error
}
