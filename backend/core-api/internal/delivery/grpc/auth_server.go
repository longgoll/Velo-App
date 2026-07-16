package grpc

import (
	"context"

	"github.com/hoanglong/chat/backend/core-api/pkg/pb/auth"
	"github.com/hoanglong/chat/backend/core-api/pkg/token"
)

type AuthServer struct {
	auth.UnimplementedAuthServiceServer
	tokenMaker token.Maker
}

func NewAuthServer(tokenMaker token.Maker) auth.AuthServiceServer {
	return &AuthServer{tokenMaker: tokenMaker}
}

func (s *AuthServer) VerifyToken(ctx context.Context, req *auth.VerifyTokenRequest) (*auth.VerifyTokenResponse, error) {
	payload, err := s.tokenMaker.VerifyToken(req.Token)
	if err != nil {
		return &auth.VerifyTokenResponse{IsValid: false}, nil
	}

	return &auth.VerifyTokenResponse{
		IsValid:  true,
		UserId:   payload.UserID,
		Username: payload.Username,
		Email:    payload.Email,
	}, nil
}
