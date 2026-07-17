package postgres

import (
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/gorm"
)

type PinnedMessageRepository struct {
	db *gorm.DB
}

func NewPinnedMessageRepository(db *gorm.DB) *PinnedMessageRepository {
	return &PinnedMessageRepository{db: db}
}

func (r *PinnedMessageRepository) Pin(pin *domain.PinnedMessage) error {
	return r.db.Create(pin).Error
}

func (r *PinnedMessageRepository) Unpin(channelID string, pinID string) error {
	result := r.db.Where("id = ? AND channel_id = ?", pinID, channelID).Delete(&domain.PinnedMessage{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("pin not found")
	}
	return nil
}

func (r *PinnedMessageRepository) ListByChannel(channelID string) ([]domain.PinnedMessage, error) {
	var pins []domain.PinnedMessage
	err := r.db.
		Where("channel_id = ?", channelID).
		Preload("Pinner").
		Order("created_at DESC").
		Find(&pins).Error
	return pins, err
}

func (r *PinnedMessageRepository) IsAlreadyPinned(channelID string, messageID string) (bool, error) {
	var count int64
	err := r.db.Model(&domain.PinnedMessage{}).
		Where("channel_id = ? AND message_id = ?", channelID, messageID).
		Count(&count).Error
	return count > 0, err
}
