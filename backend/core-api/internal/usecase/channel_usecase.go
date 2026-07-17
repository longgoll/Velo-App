package usecase

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
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

	// Verify duplicate channel name
	channels, err := u.channelRepo.ListForWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}
	for _, ch := range channels {
		if strings.EqualFold(ch.Name, req.Name) {
			return nil, errors.New("channel name already exists in this workspace")
		}
	}

	if req.Type != domain.ChannelTypeText && req.Type != domain.ChannelTypeVoice {
		req.Type = domain.ChannelTypeText
	}

	channel := &domain.Channel{
		WorkspaceID: workspaceID,
		Name:        req.Name,
		Type:        req.Type,
		IsPrivate:   req.IsPrivate,
	}

	err = u.channelRepo.Create(channel)
	if err != nil {
		return nil, err
	}

	// Auto-add creator to private channel members
	if channel.IsPrivate {
		err = u.channelRepo.AddMember(channel.ID, userID)
		if err != nil {
			return nil, err
		}
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

	allChannels, err := u.channelRepo.ListForWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}

	// Fetch private channel IDs where this user is a member
	privateChannelIDs, err := u.channelRepo.ListPrivateChannelIDsForUser(workspaceID, userID)
	if err != nil {
		return nil, err
	}

	privateMap := make(map[string]bool)
	for _, id := range privateChannelIDs {
		privateMap[id] = true
	}

	var allowedChannels []domain.Channel
	for _, ch := range allChannels {
		if !ch.IsPrivate || privateMap[ch.ID] {
			allowedChannels = append(allowedChannels, ch)
		}
	}

	return allowedChannels, nil
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
			return []domain.CallParticipant{}, nil
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

func (u *channelUseCase) Update(userID string, workspaceID string, channelID string, req *domain.UpdateChannelReq) (*domain.Channel, error) {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	// Verify permissions (admin or owner can update channels)
	if member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("only workspace owner or admin can update channels")
	}

	if req.Name == "" {
		return nil, errors.New("channel name is required")
	}

	// Verify channel exists and belongs to the workspace
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return nil, err
	}
	if channel == nil || channel.WorkspaceID != workspaceID {
		return nil, errors.New("channel not found in this workspace")
	}

	// Verify duplicate channel name (excluding current channel)
	channels, err := u.channelRepo.ListForWorkspace(workspaceID)
	if err != nil {
		return nil, err
	}
	for _, ch := range channels {
		if ch.ID != channelID && strings.EqualFold(ch.Name, req.Name) {
			return nil, errors.New("channel name already exists in this workspace")
		}
	}

	channel.Name = req.Name
	err = u.channelRepo.Update(channel)
	if err != nil {
		return nil, err
	}

	return channel, nil
}

func (u *channelUseCase) Delete(userID string, workspaceID string, channelID string) error {
	// Verify user is a member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("user is not a member of this workspace")
	}

	// Verify permissions (admin or owner can delete channels)
	if member.Role != "owner" && member.Role != "admin" {
		return errors.New("only workspace owner or admin can delete channels")
	}

	// Verify channel exists and belongs to the workspace
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return err
	}
	if channel == nil || channel.WorkspaceID != workspaceID {
		return errors.New("channel not found in this workspace")
	}

	err = u.channelRepo.Delete(channelID)
	if err != nil {
		return err
	}

	return nil
}

func (u *channelUseCase) AddMember(userID string, workspaceID string, channelID string, targetUserID string) error {
	// 1. Verify caller is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("user is not a member of this workspace")
	}

	// 2. Verify target user is member of workspace
	targetMember, err := u.workspaceRepo.GetMember(workspaceID, targetUserID)
	if err != nil {
		return err
	}
	if targetMember == nil {
		return errors.New("target user is not a member of this workspace")
	}

	// 3. Verify channel exists and is private
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return err
	}
	if channel == nil || channel.WorkspaceID != workspaceID {
		return errors.New("channel not found in this workspace")
	}
	if !channel.IsPrivate {
		return errors.New("cannot manage members of a public channel")
	}

	// 4. Verify permission: caller must be member of this private channel OR workspace owner/admin
	isCallerMember, err := u.channelRepo.IsMember(channelID, userID)
	if err != nil {
		return err
	}
	if !isCallerMember && member.Role != "owner" && member.Role != "admin" {
		return errors.New("unauthorized: only channel members or workspace admins can add members")
	}

	// 5. Check if already member
	isTargetMember, err := u.channelRepo.IsMember(channelID, targetUserID)
	if err != nil {
		return err
	}
	if isTargetMember {
		return errors.New("user is already a member of this channel")
	}

	return u.channelRepo.AddMember(channelID, targetUserID)
}

func (u *channelUseCase) RemoveMember(userID string, workspaceID string, channelID string, targetUserID string) error {
	// 1. Verify caller is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("user is not a member of this workspace")
	}

	// 2. Verify channel exists and is private
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return err
	}
	if channel == nil || channel.WorkspaceID != workspaceID {
		return errors.New("channel not found in this workspace")
	}
	if !channel.IsPrivate {
		return errors.New("cannot manage members of a public channel")
	}

	// 3. Verify permission:
	// User can remove themselves (leave).
	// Or, workspace owner/admin can remove anyone.
	if userID != targetUserID && member.Role != "owner" && member.Role != "admin" {
		return errors.New("unauthorized: you can only remove yourself or be removed by a workspace admin")
	}

	// 4. Verify target is member of channel
	isTargetMember, err := u.channelRepo.IsMember(channelID, targetUserID)
	if err != nil {
		return err
	}
	if !isTargetMember {
		return errors.New("user is not a member of this channel")
	}

	return u.channelRepo.RemoveMember(channelID, targetUserID)
}

func (u *channelUseCase) ListMembers(userID string, workspaceID string, channelID string) ([]domain.ChannelMember, error) {
	// 1. Verify caller is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("user is not a member of this workspace")
	}

	// 2. Verify channel exists and is private
	channel, err := u.channelRepo.GetByID(channelID)
	if err != nil {
		return nil, err
	}
	if channel == nil || channel.WorkspaceID != workspaceID {
		return nil, errors.New("channel not found in this workspace")
	}
	if !channel.IsPrivate {
		return nil, errors.New("cannot list members of a public channel")
	}

	// 3. Verify permission: caller must be member of this private channel OR workspace owner/admin
	isCallerMember, err := u.channelRepo.IsMember(channelID, userID)
	if err != nil {
		return nil, err
	}
	if !isCallerMember && member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("access denied: you are not a member of this private channel")
	}

	return u.channelRepo.ListMembers(channelID)
}

func (u *channelUseCase) IsMember(channelID string, userID string) (bool, error) {
	return u.channelRepo.IsMember(channelID, userID)
}
