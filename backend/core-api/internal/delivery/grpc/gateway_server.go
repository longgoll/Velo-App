package grpc

import (
	"context"
	"errors"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/hoanglong/chat/backend/core-api/pkg/pb/gateway"
)

type GatewayServer struct {
	gateway.UnimplementedGatewayServiceServer
	workspaceUseCase domain.WorkspaceUseCase
	channelUseCase   domain.ChannelUseCase
}

func NewGatewayServer(workspaceUseCase domain.WorkspaceUseCase, channelUseCase domain.ChannelUseCase) gateway.GatewayServiceServer {
	return &GatewayServer{
		workspaceUseCase: workspaceUseCase,
		channelUseCase:   channelUseCase,
	}
}

func (s *GatewayServer) CheckChannelAccess(ctx context.Context, req *gateway.CheckChannelAccessRequest) (*gateway.CheckChannelAccessResponse, error) {
	channel, err := s.channelUseCase.GetByID(req.ChannelId)
	if err != nil {
		return nil, err
	}
	if channel == nil {
		return nil, errors.New("channel not found")
	}

	member, err := s.workspaceUseCase.GetMember(channel.WorkspaceID, req.UserId)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return &gateway.CheckChannelAccessResponse{IsAllowed: false}, nil
	}

	return &gateway.CheckChannelAccessResponse{
		IsAllowed:   true,
		WorkspaceId: channel.WorkspaceID,
		Role:        member.Role,
	}, nil
}
