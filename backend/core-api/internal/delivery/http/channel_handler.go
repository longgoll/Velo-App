package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type ChannelHandler struct {
	channelUseCase domain.ChannelUseCase
}

func NewChannelHandler(router fiber.Router, authMiddleware fiber.Handler, channelUseCase domain.ChannelUseCase) {
	handler := &ChannelHandler{channelUseCase: channelUseCase}

	channelGroup := router.Group("/workspaces/:workspace_id/channels", authMiddleware)
	channelGroup.Post("/", handler.Create)
	channelGroup.Get("/", handler.List)
	channelGroup.Post("/:channel_id/token", handler.GetCallToken)
	channelGroup.Get("/:channel_id/participants", handler.GetCallParticipants)
	channelGroup.Put("/:channel_id", handler.Update)
	channelGroup.Delete("/:channel_id", handler.Delete)
}

func (h *ChannelHandler) Create(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")

	var req domain.CreateChannelReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	res, err := h.channelUseCase.Create(payload.UserID, workspaceID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *ChannelHandler) List(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")

	res, err := h.channelUseCase.List(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *ChannelHandler) GetCallToken(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")
	channelID := c.Params("channel_id")

	token, url, err := h.channelUseCase.GenerateCallToken(payload.UserID, payload.Username, workspaceID, channelID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"token": token,
		"url":   url,
	})
}

func (h *ChannelHandler) GetCallParticipants(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")
	channelID := c.Params("channel_id")

	participants, err := h.channelUseCase.GetCallParticipants(payload.UserID, workspaceID, channelID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(participants)
}

func (h *ChannelHandler) Update(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")
	channelID := c.Params("channel_id")

	var req domain.UpdateChannelReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	res, err := h.channelUseCase.Update(payload.UserID, workspaceID, channelID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *ChannelHandler) Delete(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("workspace_id")
	channelID := c.Params("channel_id")

	err := h.channelUseCase.Delete(payload.UserID, workspaceID, channelID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "channel deleted successfully",
	})
}
