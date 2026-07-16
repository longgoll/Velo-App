package gateway

import (
	"context"

	"google.golang.org/grpc"
)

type CheckChannelAccessRequest struct {
	UserId    string `json:"user_id"`
	ChannelId string `json:"channel_id"`
}

type CheckChannelAccessResponse struct {
	IsAllowed   bool   `json:"is_allowed"`
	WorkspaceId string `json:"workspace_id"`
	Role        string `json:"role"`
}

type GatewayServiceServer interface {
	CheckChannelAccess(context.Context, *CheckChannelAccessRequest) (*CheckChannelAccessResponse, error)
	mustEmbedUnimplementedGatewayServiceServer()
}

type UnimplementedGatewayServiceServer struct{}

func (UnimplementedGatewayServiceServer) CheckChannelAccess(context.Context, *CheckChannelAccessRequest) (*CheckChannelAccessResponse, error) {
	return nil, nil
}
func (UnimplementedGatewayServiceServer) mustEmbedUnimplementedGatewayServiceServer() {}

func RegisterGatewayServiceServer(s grpc.ServiceRegistrar, srv GatewayServiceServer) {
	// Mock registration
}
