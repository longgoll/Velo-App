package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type WorkspaceHandler struct {
	workspaceUseCase domain.WorkspaceUseCase
}

func NewWorkspaceHandler(router fiber.Router, authMiddleware fiber.Handler, workspaceUseCase domain.WorkspaceUseCase) {
	handler := &WorkspaceHandler{workspaceUseCase: workspaceUseCase}

	wsGroup := router.Group("/workspaces", authMiddleware)
	wsGroup.Post("/", handler.Create)
	wsGroup.Get("/", handler.List)
	wsGroup.Post("/:id/join", handler.Join)
	wsGroup.Get("/:id/members", handler.ListMembers)
	wsGroup.Get("/:id/dms", handler.ListDMs)
	wsGroup.Post("/:id/dms", handler.CreateDM)
}

func (h *WorkspaceHandler) Create(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	var req domain.CreateWorkspaceReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	res, err := h.workspaceUseCase.Create(payload.UserID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *WorkspaceHandler) List(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	res, err := h.workspaceUseCase.List(payload.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *WorkspaceHandler) Join(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	err := h.workspaceUseCase.Join(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "successfully joined workspace",
	})
}

type CreateDMReq struct {
	RecipientID string `json:"recipient_id" validate:"required"`
}

func (h *WorkspaceHandler) ListMembers(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	res, err := h.workspaceUseCase.ListMembers(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *WorkspaceHandler) ListDMs(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	res, err := h.workspaceUseCase.ListDMChannels(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *WorkspaceHandler) CreateDM(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	var req CreateDMReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.RecipientID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "recipient_id is required",
		})
	}

	res, err := h.workspaceUseCase.GetOrCreateDMChannel(payload.UserID, workspaceID, req.RecipientID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
