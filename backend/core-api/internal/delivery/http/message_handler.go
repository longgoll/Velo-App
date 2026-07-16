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
