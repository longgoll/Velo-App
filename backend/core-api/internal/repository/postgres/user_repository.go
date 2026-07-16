package postgres

import (
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/gorm"
)

type userGormRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) domain.UserRepository {
	return &userGormRepository{db: db}
}

func (r *userGormRepository) Create(user *domain.User) error {
	return r.db.Create(user).Error
}

func (r *userGormRepository) GetByEmail(email string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (r *userGormRepository) GetByID(id string) (*domain.User, error) {
	var user domain.User
	err := r.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}
