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
	wsGroup.Post("/join", handler.JoinByInviteCode)
	wsGroup.Post("/:id/join", handler.Join)
	wsGroup.Put("/:id", handler.Update)
	wsGroup.Delete("/:id", handler.Delete)
	wsGroup.Post("/:id/leave", handler.Leave)
	wsGroup.Get("/:id/members", handler.ListMembers)
	wsGroup.Put("/:id/members/:userId", handler.UpdateMemberRole)
	wsGroup.Delete("/:id/members/:userId", handler.KickMember)
	wsGroup.Post("/:id/invite-code/regenerate", handler.RegenerateInviteCode)
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

func (h *WorkspaceHandler) Update(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	var req domain.UpdateWorkspaceReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	res, err := h.workspaceUseCase.Update(payload.UserID, workspaceID, &req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *WorkspaceHandler) Delete(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	err := h.workspaceUseCase.Delete(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "successfully deleted workspace",
	})
}

func (h *WorkspaceHandler) JoinByInviteCode(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	var req domain.JoinByInviteCodeReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	res, err := h.workspaceUseCase.JoinByInviteCode(payload.UserID, req.InviteCode)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}

func (h *WorkspaceHandler) Leave(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	err := h.workspaceUseCase.Leave(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "successfully left workspace",
	})
}

func (h *WorkspaceHandler) UpdateMemberRole(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")
	userID := c.Params("userId")

	var req domain.UpdateMemberRoleReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	err := h.workspaceUseCase.UpdateMemberRole(payload.UserID, workspaceID, userID, req.Role)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "successfully updated member role",
	})
}

func (h *WorkspaceHandler) KickMember(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")
	userID := c.Params("userId")

	err := h.workspaceUseCase.KickMember(payload.UserID, workspaceID, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "successfully kicked member from workspace",
	})
}

func (h *WorkspaceHandler) RegenerateInviteCode(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	workspaceID := c.Params("id")

	newCode, err := h.workspaceUseCase.RegenerateInviteCode(payload.UserID, workspaceID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"invite_code": newCode,
	})
}
