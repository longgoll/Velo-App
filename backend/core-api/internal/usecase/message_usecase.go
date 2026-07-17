package usecase

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type messageUseCase struct {
	messageRepo   domain.MessageRepository
	channelRepo   domain.ChannelRepository
	workspaceRepo domain.WorkspaceRepository
	db            *gorm.DB
	redisClient   *redis.Client
}

func NewMessageUseCase(
	messageRepo domain.MessageRepository,
	channelRepo domain.ChannelRepository,
	workspaceRepo domain.WorkspaceRepository,
	db *gorm.DB,
	redisClient *redis.Client,
) domain.MessageUseCase {
	return &messageUseCase{
		messageRepo:   messageRepo,
		channelRepo:   channelRepo,
		workspaceRepo: workspaceRepo,
		db:            db,
		redisClient:   redisClient,
	}
}

func (u *messageUseCase) GetHistory(userID string, channelID string, limit int, before time.Time) ([]*domain.Message, error) {
	// 1. Get channel to find the Workspace ID
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return nil, err
	}

	if channel != nil {
		// 2. Check if user is a member of the workspace
		member, err := u.workspaceRepo.GetMember(channel.WorkspaceID, userID)
		if err != nil {
			return nil, err
		}
		if member == nil {
			return nil, errors.New("access denied: you are not a member of this workspace")
		}

		// Check private channel membership
		if channel.IsPrivate {
			isChanMember, err := u.channelRepo.IsMember(channelID, userID)
			if err != nil {
				return nil, err
			}
			if !isChanMember {
				return nil, errors.New("access denied: you are not a member of this private channel")
			}
		}
	} else {
		// 3. Try to get DM Channel
		dmChannel, err := u.workspaceRepo.GetDMChannelByID(channelID)
		if err != nil {
			return nil, err
		}
		if dmChannel == nil {
			return nil, errors.New("channel not found")
		}

		// Check if user is participant of DM
		if dmChannel.UserOneID != userID && dmChannel.UserTwoID != userID {
			return nil, errors.New("access denied: you are not a participant of this direct message channel")
		}
	}

	// 4. Set limit constraints
	if limit <= 0 {
		limit = 50
	} else if limit > 100 {
		limit = 100
	}

	// 5. Fetch messages from ScyllaDB
	msgs, err := u.messageRepo.GetByChannel(channelID, limit, before)
	if err != nil {
		return nil, err
	}

	if len(msgs) == 0 {
		return msgs, nil
	}

	// 6. Fetch reactions from PostgreSQL for these messages
	msgIDs := make([]string, len(msgs))
	for i, m := range msgs {
		msgIDs[i] = m.ID
	}

	var dbReactions []domain.MessageReaction
	err = u.db.Where("message_id IN ?", msgIDs).Find(&dbReactions).Error
	if err == nil && len(dbReactions) > 0 {
		// Group reactions by message ID
		reactionMap := make(map[string][]domain.MessageReaction)
		for _, r := range dbReactions {
			reactionMap[r.MessageID] = append(reactionMap[r.MessageID], r)
		}

		// Map to domain.Message.Reactions
		for _, m := range msgs {
			mReactions := reactionMap[m.ID]
			m.Reactions = buildReactionSummary(mReactions, userID)
		}
	} else {
		for _, m := range msgs {
			m.Reactions = make([]domain.ReactionSummary, 0)
		}
	}

	return msgs, nil
}

func (u *messageUseCase) GetLatestMessages(userID string, channelIDs []string) (map[string]*domain.Message, error) {
	type chanResult struct {
		channelID string
		msg       *domain.Message
	}

	resChan := make(chan chanResult, len(channelIDs))
	var wg sync.WaitGroup

	for _, cid := range channelIDs {
		wg.Add(1)
		go func(channelID string) {
			defer wg.Done()

			// 1. Verify access to the channel
			channel, err := u.channelRepo.GetByID(channelID)
			if err != nil {
				return
			}

			allowed := false
			if channel != nil {
				// Check if user is member of workspace
				member, err := u.workspaceRepo.GetMember(channel.WorkspaceID, userID)
				if err == nil && member != nil {
					if !channel.IsPrivate {
						allowed = true
					} else {
						// Check private channel membership
						isChanMember, err := u.channelRepo.IsMember(channelID, userID)
						if err == nil && isChanMember {
							allowed = true
						}
					}
				}
			} else {
				// Check DM Channel
				dmChannel, err := u.workspaceRepo.GetDMChannelByID(channelID)
				if err == nil && dmChannel != nil {
					if dmChannel.UserOneID == userID || dmChannel.UserTwoID == userID {
						allowed = true
					}
				}
			}

			if !allowed {
				return
			}

			// 2. Fetch the latest message (limit = 1) from ScyllaDB
			messages, err := u.messageRepo.GetByChannel(channelID, 1, time.Time{})
			if err == nil && len(messages) > 0 {
				resChan <- chanResult{channelID: channelID, msg: messages[0]}
			}
		}(cid)
	}

	wg.Wait()
	close(resChan)

	result := make(map[string]*domain.Message)
	for res := range resChan {
		result[res.channelID] = res.msg
	}

	return result, nil
}

func buildReactionSummary(reactions []domain.MessageReaction, currentUserID string) []domain.ReactionSummary {
	groups := make(map[string][]string) // emoji -> usernames
	meMap := make(map[string]bool)       // emoji -> user reacted

	for _, r := range reactions {
		groups[r.Emoji] = append(groups[r.Emoji], r.Username)
		if r.UserID == currentUserID {
			meMap[r.Emoji] = true
		}
	}

	summaries := make([]domain.ReactionSummary, 0, len(groups))
	for emoji, usernames := range groups {
		summaries = append(summaries, domain.ReactionSummary{
			Emoji:     emoji,
			Usernames: usernames,
			Me:        meMap[emoji],
		})
	}
	return summaries
}

type queueMessage struct {
	ID        string                   `json:"id"`
	ChannelID string                   `json:"channel_id"`
	UserID    string                   `json:"user_id"`
	Username  string                   `json:"username"`
	Content   string                   `json:"content"`
	Timestamp int64                    `json:"timestamp"`
	Reactions []domain.ReactionSummary `json:"reactions,omitempty"`
}

func (u *messageUseCase) broadcastMessageUpdate(msg *domain.Message) {
	pubMsg := queueMessage{
		ID:        msg.ID,
		ChannelID: msg.ChannelID,
		UserID:    msg.UserID,
		Username:  msg.Username,
		Content:   msg.Content,
		Timestamp: msg.Timestamp.UnixMilli(),
		Reactions: msg.Reactions,
	}
	payload, err := json.Marshal(pubMsg)
	if err != nil {
		return
	}

	pubsubKey := fmt.Sprintf("chat:%s", msg.ChannelID)
	ctx := context.Background()
	if err := u.redisClient.Publish(ctx, pubsubKey, payload).Err(); err != nil {
		log.Printf("Usecase broadcast: Failed to publish message update: %v", err)
	}
}

func (u *messageUseCase) AddReaction(userID, channelID, messageID, emoji, content, authorUsername, authorUserID string, timestamp int64) (*domain.Message, error) {
	// 1. Fetch the user info to get username
	var user domain.User
	if err := u.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}

	// 2. Insert or update reaction
	var existing domain.MessageReaction
	err := u.db.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			newReaction := domain.MessageReaction{
				MessageID: messageID,
				UserID:    userID,
				Username:  user.Username,
				Emoji:     emoji,
				CreatedAt: time.Now(),
			}
			if err := u.db.Create(&newReaction).Error; err != nil {
				return nil, err
			}
		} else {
			return nil, err
		}
	}

	// 3. Rebuild message details
	var dbReactions []domain.MessageReaction
	if err := u.db.Where("message_id = ?", messageID).Find(&dbReactions).Error; err != nil {
		return nil, err
	}

	updatedMsg := &domain.Message{
		ID:        messageID,
		ChannelID: channelID,
		UserID:    authorUserID,
		Username:  authorUsername,
		Content:   content,
		Timestamp: time.UnixMilli(timestamp),
		Reactions: buildReactionSummary(dbReactions, userID),
	}

	// 4. Broadcast updated message details
	u.broadcastMessageUpdate(updatedMsg)

	return updatedMsg, nil
}

func (u *messageUseCase) RemoveReaction(userID, channelID, messageID, emoji, content, authorUsername, authorUserID string, timestamp int64) (*domain.Message, error) {
	// 1. Delete reaction
	if err := u.db.Where("message_id = ? AND user_id = ? AND emoji = ?", messageID, userID, emoji).Delete(&domain.MessageReaction{}).Error; err != nil {
		return nil, err
	}

	// 2. Rebuild message details
	var dbReactions []domain.MessageReaction
	if err := u.db.Where("message_id = ?", messageID).Find(&dbReactions).Error; err != nil {
		return nil, err
	}

	updatedMsg := &domain.Message{
		ID:        messageID,
		ChannelID: channelID,
		UserID:    authorUserID,
		Username:  authorUsername,
		Content:   content,
		Timestamp: time.UnixMilli(timestamp),
		Reactions: buildReactionSummary(dbReactions, userID),
	}

	// 3. Broadcast updated message details
	u.broadcastMessageUpdate(updatedMsg)

	return updatedMsg, nil
}
