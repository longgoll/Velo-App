package auth

import (
	"context"

	"google.golang.org/grpc"
)

type VerifyTokenRequest struct {
	Token string `json:"token"`
}

type VerifyTokenResponse struct {
	IsValid  bool   `json:"is_valid"`
	UserId   string `json:"user_id"`
	Username string `json:"username"`
	Email    string `json:"email"`
}

type AuthServiceServer interface {
	VerifyToken(context.Context, *VerifyTokenRequest) (*VerifyTokenResponse, error)
	mustEmbedUnimplementedAuthServiceServer()
}

type UnimplementedAuthServiceServer struct{}

func (UnimplementedAuthServiceServer) VerifyToken(context.Context, *VerifyTokenRequest) (*VerifyTokenResponse, error) {
	return nil, nil
}
func (UnimplementedAuthServiceServer) mustEmbedUnimplementedAuthServiceServer() {}

func RegisterAuthServiceServer(s grpc.ServiceRegistrar, srv AuthServiceServer) {
	// Mock registration
}
