package usecase

import (
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type notificationUseCase struct {
	notificationRepo domain.NotificationRepository
}

func NewNotificationUseCase(notificationRepo domain.NotificationRepository) domain.NotificationUseCase {
	return &notificationUseCase{
		notificationRepo: notificationRepo,
	}
}

func (u *notificationUseCase) List(userID string, limit int, offset int) ([]domain.Notification, error) {
	if limit <= 0 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}
	return u.notificationRepo.ListForUser(userID, limit, offset)
}

func (u *notificationUseCase) MarkAsRead(userID string, notificationID string) error {
	return u.notificationRepo.MarkAsRead(userID, notificationID)
}

func (u *notificationUseCase) MarkAllAsRead(userID string) error {
	return u.notificationRepo.MarkAllAsRead(userID)
}

func (u *notificationUseCase) GetUnreadCount(userID string) (int64, error) {
	return u.notificationRepo.GetUnreadCount(userID)
}
