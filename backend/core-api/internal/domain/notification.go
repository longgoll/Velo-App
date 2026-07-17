package domain

type NotificationRepository interface {
	Create(notification *Notification) error
	CreateInBatches(notifications []*Notification) error
	ListForUser(userID string, limit int, offset int) ([]Notification, error)
	MarkAsRead(userID string, notificationID string) error
	MarkAllAsRead(userID string) error
	GetUnreadCount(userID string) (int64, error)
}

type NotificationUseCase interface {
	List(userID string, limit int, offset int) ([]Notification, error)
	MarkAsRead(userID string, notificationID string) error
	MarkAllAsRead(userID string) error
	GetUnreadCount(userID string) (int64, error)
}
