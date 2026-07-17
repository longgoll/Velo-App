package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type PinnedMessageHandler struct {
	useCase domain.PinnedMessageUseCase
}

func NewPinnedMessageHandler(router fiber.Router, authMiddleware fiber.Handler, useCase domain.PinnedMessageUseCase) {
	handler := &PinnedMessageHandler{useCase: useCase}

	pinGroup := router.Group("/channels/:channel_id/pins", authMiddleware)
	pinGroup.Get("/", handler.List)
	pinGroup.Post("/", handler.Pin)
	pinGroup.Delete("/:pin_id", handler.Unpin)
}

// GET /api/channels/:channel_id/pins
func (h *PinnedMessageHandler) List(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")

	pins, err := h.useCase.ListByChannel(payload.UserID, channelID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(pins)
}

// POST /api/channels/:channel_id/pins
func (h *PinnedMessageHandler) Pin(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")

	var req struct {
		MessageID string `json:"message_id"`
		Content   string `json:"content"`
		Username  string `json:"username"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}
	if req.MessageID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "message_id is required",
		})
	}

	pin, err := h.useCase.Pin(payload.UserID, channelID, req.MessageID, req.Content, req.Username)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(pin)
}

// DELETE /api/channels/:channel_id/pins/:pin_id
func (h *PinnedMessageHandler) Unpin(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	channelID := c.Params("channel_id")
	pinID := c.Params("pin_id")

	if err := h.useCase.Unpin(payload.UserID, channelID, pinID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{"message": "unpinned successfully"})
}
