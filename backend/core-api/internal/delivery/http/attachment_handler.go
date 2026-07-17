package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type AttachmentHandler struct {
	attachmentUseCase domain.AttachmentUseCase
}

func NewAttachmentHandler(router fiber.Router, authMiddleware fiber.Handler, attachmentUseCase domain.AttachmentUseCase) {
	handler := &AttachmentHandler{attachmentUseCase: attachmentUseCase}

	router.Post("/attachments/presign", authMiddleware, handler.PresignUpload)
}

func (h *AttachmentHandler) PresignUpload(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	var req domain.PresignUploadReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Filename == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "filename is required",
		})
	}

	res, err := h.attachmentUseCase.PresignUpload(c.Context(), payload.UserID, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
