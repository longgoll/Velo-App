package http

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type NotificationHandler struct {
	notificationUseCase domain.NotificationUseCase
}

func NewNotificationHandler(router fiber.Router, authMiddleware fiber.Handler, notificationUseCase domain.NotificationUseCase) {
	handler := &NotificationHandler{notificationUseCase: notificationUseCase}

	notificationGroup := router.Group("/notifications", authMiddleware)
	notificationGroup.Get("/", handler.List)
	notificationGroup.Put("/read-all", handler.MarkAllAsRead)
	notificationGroup.Put("/:id/read", handler.MarkAsRead)
	notificationGroup.Get("/unread-count", handler.GetUnreadCount)
}

func (h *NotificationHandler) List(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	limitVal := c.Query("limit", "20")
	limit, err := strconv.Atoi(limitVal)
	if err != nil || limit <= 0 {
		limit = 20
	}

	offsetVal := c.Query("offset", "0")
	offset, err := strconv.Atoi(offsetVal)
	if err != nil || offset < 0 {
		offset = 0
	}

	notifications, err := h.notificationUseCase.List(payload.UserID, limit, offset)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(notifications)
}

func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)
	notificationID := c.Params("id")

	err := h.notificationUseCase.MarkAsRead(payload.UserID, notificationID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "notification marked as read",
	})
}

func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	err := h.notificationUseCase.MarkAllAsRead(payload.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "all notifications marked as read",
	})
}

func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	payload := c.Locals(authorizationPayloadKey).(*token.Payload)

	count, err := h.notificationUseCase.GetUnreadCount(payload.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"unread_count": count,
	})
}
