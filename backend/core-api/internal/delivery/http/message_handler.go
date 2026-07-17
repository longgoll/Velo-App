package http

import (
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type MessageHandler struct {
	messageUseCase domain.MessageUseCase
}

func NewMessageHandler(router fiber.Router, authMiddleware fiber.Handler, messageUseCase domain.MessageUseCase) {
	handler := &MessageHandler{messageUseCase: messageUseCase}

	router.Get("/channels/:channel_id/messages", authMiddleware, handler.GetHistory)
	router.Post("/messages/latest", authMiddleware, handler.GetLatestMessages)
	router.Post("/channels/:channel_id/messages/:message_id/reactions", authMiddleware, handler.AddReaction)
	router.Delete("/channels/:channel_id/messages/:message_id/reactions", authMiddleware, handler.RemoveReaction)
}

func (h *MessageHandler) GetHistory(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")

	// Parse optional limit
	limitVal := c.Query("limit", "50")
	limit, err := strconv.Atoi(limitVal)
	if err != nil || limit <= 0 {
		limit = 50
	}

	// Parse optional before timestamp
	var before time.Time
	beforeStr := c.Query("before")
	if beforeStr != "" {
		if t, err := time.Parse(time.RFC3339, beforeStr); err == nil {
			before = t
		} else {
			if ts, err := strconv.ParseInt(beforeStr, 10, 64); err == nil {
				before = time.UnixMilli(ts)
			}
		}
	}

	messages, err := h.messageUseCase.GetHistory(payload.UserID, channelID, limit, before)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(messages)
}

type GetLatestMessagesReq struct {
	ChannelIDs []string `json:"channel_ids" validate:"required"`
}

func (h *MessageHandler) GetLatestMessages(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	var req GetLatestMessagesReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	latest, err := h.messageUseCase.GetLatestMessages(payload.UserID, req.ChannelIDs)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(latest)
}

func (h *MessageHandler) AddReaction(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")
	messageID := c.Params("message_id")

	var req struct {
		Emoji     string `json:"emoji"`
		Content   string `json:"content"`
		Username  string `json:"username"`
		UserID    string `json:"user_id"`
		Timestamp int64  `json:"timestamp"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updated, err := h.messageUseCase.AddReaction(payload.UserID, channelID, messageID, req.Emoji, req.Content, req.Username, req.UserID, req.Timestamp)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(updated)
}

func (h *MessageHandler) RemoveReaction(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")
	messageID := c.Params("message_id")

	var req struct {
		Emoji     string `json:"emoji"`
		Content   string `json:"content"`
		Username  string `json:"username"`
		UserID    string `json:"user_id"`
		Timestamp int64  `json:"timestamp"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	updated, err := h.messageUseCase.RemoveReaction(payload.UserID, channelID, messageID, req.Emoji, req.Content, req.Username, req.UserID, req.Timestamp)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(updated)
}
