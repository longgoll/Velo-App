package usecase

import (
	"errors"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
	"golang.org/x/crypto/bcrypt"
)

type userUseCase struct {
	userRepo   domain.UserRepository
	tokenMaker token.Maker
}

func NewUserUseCase(userRepo domain.UserRepository, tokenMaker token.Maker) domain.UserUseCase {
	return &userUseCase{
		userRepo:   userRepo,
		tokenMaker: tokenMaker,
	}
}

func (u *userUseCase) Register(req *domain.RegisterReq) (*domain.AuthRes, error) {
	// Check if email already exists
	existing, err := u.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("email is already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &domain.User{
		Username: req.Username,
		Email:    req.Email,
		Password: string(hashedPassword),
	}

	// Save to DB
	err = u.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	// Generate Paseto token (expires in 24 hours)
	tokenStr, err := u.tokenMaker.CreateToken(user.ID, user.Username, user.Email, 24*time.Hour)
	if err != nil {
		return nil, err
	}

	return &domain.AuthRes{
		Token: tokenStr,
		User:  user,
	}, nil
}

func (u *userUseCase) Login(req *domain.LoginReq) (*domain.AuthRes, error) {
	// Find user
	user, err := u.userRepo.GetByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("invalid email or password")
	}

	// Compare password
	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Generate Paseto token
	tokenStr, err := u.tokenMaker.CreateToken(user.ID, user.Username, user.Email, 24*time.Hour)
	if err != nil {
		return nil, err
	}

	return &domain.AuthRes{
		Token: tokenStr,
		User:  user,
	}, nil
}
