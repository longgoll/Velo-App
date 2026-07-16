package token

import (
	"errors"
	"time"

	"github.com/o1egl/paseto"
)

type Maker interface {
	CreateToken(userID string, username string, email string, duration time.Duration) (string, error)
	VerifyToken(token string) (*Payload, error)
}

type Payload struct {
	UserID    string    `json:"user_id"`
	Username  string    `json:"username"`
	Email     string    `json:"email"`
	IssuedAt  time.Time `json:"issued_at"`
	ExpiredAt time.Time `json:"expired_at"`
}

func (payload *Payload) Valid() error {
	if time.Now().After(payload.ExpiredAt) {
		return errors.New("token has expired")
	}
	return nil
}

type PasetoMaker struct {
	paseto       *paseto.V2
	symmetricKey []byte
}

func NewPasetoMaker(symmetricKey string) (Maker, error) {
	if len(symmetricKey) < 32 {
		return nil, errors.New("invalid key size: must be at least 32 characters")
	}
	return &PasetoMaker{
		paseto:       paseto.NewV2(),
		symmetricKey: []byte(symmetricKey),
	}, nil
}

func (maker *PasetoMaker) CreateToken(userID string, username string, email string, duration time.Duration) (string, error) {
	payload := &Payload{
		UserID:    userID,
		Username:  username,
		Email:     email,
		IssuedAt:  time.Now(),
		ExpiredAt: time.Now().Add(duration),
	}
	return maker.paseto.Encrypt(maker.symmetricKey, payload, nil)
}

func (maker *PasetoMaker) VerifyToken(token string) (*Payload, error) {
	payload := &Payload{}
	err := maker.paseto.Decrypt(token, maker.symmetricKey, payload, nil)
	if err != nil {
		return nil, errors.New("invalid token")
	}
	err = payload.Valid()
	if err != nil {
		return nil, err
	}
	return payload, nil
}
