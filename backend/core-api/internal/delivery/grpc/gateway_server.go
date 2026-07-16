package grpc

import (
	"context"

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
	if err == nil && channel != nil {
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

	// Try checking if it's a DM Channel
	dmChannel, err := s.workspaceUseCase.GetDMChannelByID(req.ChannelId)
	if err != nil {
		return nil, err
	}
	if dmChannel != nil {
		if dmChannel.UserOneID == req.UserId || dmChannel.UserTwoID == req.UserId {
			return &gateway.CheckChannelAccessResponse{
				IsAllowed:   true,
				WorkspaceId: dmChannel.WorkspaceID,
				Role:        "member",
			}, nil
		}
	}

	return &gateway.CheckChannelAccessResponse{IsAllowed: false}, nil
}
