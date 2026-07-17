package postgres

import (
	"errors"
	"time"

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

func (r *channelGormRepository) AddMember(channelID string, userID string) error {
	member := &domain.ChannelMember{
		ChannelID: channelID,
		UserID:    userID,
		JoinedAt:  time.Now(),
	}
	return r.db.Create(member).Error
}

func (r *channelGormRepository) RemoveMember(channelID string, userID string) error {
	return r.db.Where("channel_id = ? AND user_id = ?", channelID, userID).Delete(&domain.ChannelMember{}).Error
}

func (r *channelGormRepository) ListMembers(channelID string) ([]domain.ChannelMember, error) {
	var members []domain.ChannelMember
	err := r.db.Preload("User").Where("channel_id = ?", channelID).Find(&members).Error
	return members, err
}

func (r *channelGormRepository) IsMember(channelID string, userID string) (bool, error) {
	var count int64
	err := r.db.Model(&domain.ChannelMember{}).Where("channel_id = ? AND user_id = ?", channelID, userID).Count(&count).Error
	return count > 0, err
}

func (r *channelGormRepository) ListPrivateChannelIDsForUser(workspaceID string, userID string) ([]string, error) {
	var ids []string
	err := r.db.Model(&domain.ChannelMember{}).
		Joins("JOIN channels ON channels.id = channel_members.channel_id").
		Where("channels.workspace_id = ? AND channel_members.user_id = ? AND channels.deleted_at IS NULL", workspaceID, userID).
		Pluck("channel_members.channel_id", &ids).Error
	return ids, err
}
