package domain

import "time"

type ReactionSummary struct {
	Emoji     string   `json:"emoji"`
	Usernames []string `json:"usernames"`
	Me        bool     `json:"me"`
}

type Message struct {
	ID        string            `json:"id"`
	ChannelID string            `json:"channel_id"`
	UserID    string            `json:"user_id"`
	Username  string            `json:"username"`
	Content   string            `json:"content"`
	Timestamp time.Time         `json:"timestamp"`
	Reactions []ReactionSummary `json:"reactions"`
}

type MessageRepository interface {
	Save(msg *Message) error
	GetByChannel(channelID string, limit int, before time.Time) ([]*Message, error)
}

type MessageUseCase interface {
	GetHistory(userID string, channelID string, limit int, before time.Time) ([]*Message, error)
	GetLatestMessages(userID string, channelIDs []string) (map[string]*Message, error)
	AddReaction(userID, channelID, messageID, emoji, content, authorUsername, authorUserID string, timestamp int64) (*Message, error)
	RemoveReaction(userID, channelID, messageID, emoji, content, authorUsername, authorUserID string, timestamp int64) (*Message, error)
}
