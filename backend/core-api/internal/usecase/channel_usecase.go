package usecase

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/livekit/protocol/auth"
)

type channelUseCase struct {
	channelRepo   domain.ChannelRepository
	workspaceRepo domain.WorkspaceRepository
	livekitURL    string
	livekitKey    string
	livekitSecret string
}

func NewChannelUseCase(
	channelRepo domain.ChannelRepository,
	workspaceRepo domain.WorkspaceRepository,
	livekitURL string,
	livekitKey string,
	livekitSecret string,
) domain.ChannelUseCase {
	return &channelUseCase{
		channelRepo:   channelRepo,
		workspaceRepo: workspaceRepo,
		livekitURL:    livekitURL,
		livekitKey:    livekitKey,
		livekitSecret: livekitSecret,
	}
}

func (u *channelUseCase) Create(userID string, workspaceID string, req *domain.CreateChannelReq) (*domain.Channel, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	// Verify permissions (admin or owner can create channels)
	if member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("only workspace owner or admin can create channels")
	}

	if req.Name == "" {
		return nil, errors.New("channel name is required")
	}

	if req.Type != domain.ChannelTypeText && req.Type != domain.ChannelTypeVoice {
		req.Type = domain.ChannelTypeText
	}

	channel := &domain.Channel{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Type:        req.Type,
	}

	err = u.channelRepo.Create(channel)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (u *channelUseCase) List(userID string, workspaceID string) ([]domain.Channel, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	return u.channelRepo.ListForWorkspace(workspaceID)
}

func (u *channelUseCase) GetByID(channelID string) (*domain.Channel, error) {
	return u.channelRepo.GetByID(channelID)
}

func (u *channelUseCase) GenerateCallToken(userID string, username string, workspaceID string, channelID string) (string, string, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return "", "", err
	}
	if member == nil {
		return "", "", errors.New("user is not a member of this workspace")
	}

	// Verify channel exists (regular workspace channel or DM channel)
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil || channel == nil {
		// Attempt to query as DM channel
		dmChannel, dmErr := u.workspaceRepo.GetDMChannelByID(channelID)
		if dmErr != nil || dmChannel == nil {
			return "", "", errors.New("channel or dm channel not found")
		}
		// Verify user is a participant of this DM channel
		if dmChannel.UserOneID != userID && dmChannel.UserTwoID != userID {
			return "", "", errors.New("user is not a participant of this DM channel")
		}
	} else {
		// Regular channel
		if channel.WorkspaceID != workspaceID {
			return "", "", errors.New("channel not found in this workspace")
		}
		if channel.Type != domain.ChannelTypeVoice {
			return "", "", errors.New("cannot start a voice call in a text channel")
		}
	}

	// Generate LiveKit Room Access Token
	at := auth.NewAccessToken(u.livekitKey, u.livekitSecret)
	grant := &auth.VideoGrant{
		RoomJoin: true,
		Room:     channelID,
	}
	at.SetVideoGrant(grant)
	at.SetIdentity(userID)
	at.SetName(username)
	at.SetValidFor(24 * time.Hour)

	token, err := at.ToJWT()
	if err != nil {
		return "", "", err
	}

	return token, u.livekitURL, nil
}

func (u *channelUseCase) GetCallParticipants(userID string, workspaceID string, channelID string) ([]domain.CallParticipant, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	// Verify channel exists (regular channel or DM channel)
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil || channel == nil {
		dmChannel, dmErr := u.workspaceRepo.GetDMChannelByID(channelID)
		if dmErr != nil || dmChannel == nil {
			return nil, errors.New("channel or dm room not found")
		}
		if dmChannel.UserOneID != userID && dmChannel.UserTwoID != userID {
			return nil, errors.New("unauthorized access to this DM channel")
		}
	} else {
		if channel.WorkspaceID != workspaceID {
			return nil, errors.New("channel not found in this workspace")
		}
		if channel.Type != domain.ChannelTypeVoice {
			return nil, errors.New("participants list is only available for voice channels")
		}
	}

	// Create LiveKit token with RoomAdmin permissions to query participants
	at := auth.NewAccessToken(u.livekitKey, u.livekitSecret)
	grant := &auth.VideoGrant{
		RoomAdmin: true,
		Room:      channelID,
	}
	at.SetVideoGrant(grant)
	at.SetIdentity("admin-service")
	at.SetValidFor(5 * time.Minute)

	token, err := at.ToJWT()
	if err != nil {
		return nil, err
	}

	// Make HTTP POST call to LiveKit Twirp RoomService endpoint
	bodyData, err := json.Marshal(map[string]string{"room": channelID})
	if err != nil {
		return nil, err
	}

	apiURL := u.livekitURL + "/twirp/livekit.RoomService/ListParticipants"
	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(bodyData))
	if err != nil {
		return nil, err
	}

	req.Header.Set("Authorization", "Bearer " + token)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 5 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		// If LiveKit server is unreachable, log and return empty list
		return []domain.CallParticipant{}, nil
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// LiveKit room might not exist yet if no one is in it, return empty
		return []domain.CallParticipant{}, nil
	}

	var livekitResp struct {
		Participants []struct {
			Identity string `json:"identity"`
			Name     string `json:"name"`
			State    string `json:"state"`
		} `json:"participants"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&livekitResp); err != nil {
		return nil, err
	}

	results := make([]domain.CallParticipant, len(livekitResp.Participants))
	for i, p := range livekitResp.Participants {
		results[i] = domain.CallParticipant{
			Identity: p.Identity,
			Name:     p.Name,
			State:    p.State,
		}
	}

	return results, nil
}
