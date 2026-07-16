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
