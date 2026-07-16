package http

import (
	"github.com/gofiber/fiber/v2"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

type UserHandler struct {
	userUseCase domain.UserUseCase
}

func NewUserHandler(router fiber.Router, userUseCase domain.UserUseCase) {
	handler := &UserHandler{userUseCase: userUseCase}

	authGroup := router.Group("/auth")
	authGroup.Post("/register", handler.Register)
	authGroup.Post("/login", handler.Login)
}

func (h *UserHandler) Register(c *fiber.Ctx) error {
	var req domain.RegisterReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	// Basic validation
	if req.Username == "" || req.Email == "" || len(req.Password) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "username and email are required, password must be at least 6 characters",
		})
	}

	res, err := h.userUseCase.Register(&req)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(res)
}

func (h *UserHandler) Login(c *fiber.Ctx) error {
	var req domain.LoginReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "invalid request body",
		})
	}

	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "email and password are required",
		})
	}

	res, err := h.userUseCase.Login(&req)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusOK).JSON(res)
}
