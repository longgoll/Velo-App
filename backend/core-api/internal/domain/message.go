package domain

import "time"

type Message struct {
	ID        string    `json:"id"`
	ChannelID string    `json:"channel_id"`
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

type MessageRepository interface {
	Save(msg *Message) error
	GetByChannel(channelID string, limit int, before time.Time) ([]*Message, error)
}

type MessageUseCase interface {
	GetHistory(userID string, channelID string, limit int, before time.Time) ([]*Message, error)
	GetLatestMessages(userID string, channelIDs []string) (map[string]*Message, error)
}
