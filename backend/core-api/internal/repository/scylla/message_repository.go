package scylla

import (
	"time"

	"github.com/gocql/gocql"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type messageRepository struct {
	session *gocql.Session
}

func NewMessageRepository(session *gocql.Session) domain.MessageRepository {
	return &messageRepository{session: session}
}

func (r *messageRepository) Save(msg *domain.Message) error {
	query := `INSERT INTO messages (channel_id, timestamp, message_id, user_id, username, content) VALUES (?, ?, ?, ?, ?, ?)`
	return r.session.Query(query, msg.ChannelID, msg.Timestamp, msg.ID, msg.UserID, msg.Username, msg.Content).Exec()
}

func (r *messageRepository) GetByChannel(channelID string, limit int, before time.Time) ([]*domain.Message, error) {
	var query string
	var queryParams []interface{}
	
	if before.IsZero() {
		query = `SELECT channel_id, timestamp, message_id, user_id, username, content FROM messages WHERE channel_id = ? LIMIT ?`
		queryParams = []interface{}{channelID, limit}
	} else {
		query = `SELECT channel_id, timestamp, message_id, user_id, username, content FROM messages WHERE channel_id = ? AND timestamp < ? LIMIT ?`
		queryParams = []interface{}{channelID, before, limit}
	}
	
	iter := r.session.Query(query, queryParams...).Iter()
	var messages []*domain.Message
	
	var cID, msgID, uID, username, content string
	var timestamp time.Time
	
	for iter.Scan(&cID, &timestamp, &msgID, &uID, &username, &content) {
		messages = append(messages, &domain.Message{
			ID:        msgID,
			ChannelID: cID,
			UserID:    uID,
			Username:  username,
			Content:   content,
			Timestamp: timestamp,
		})
	}
	
	if err := iter.Close(); err != nil {
		return nil, err
	}
	
	return messages, nil
}
