package usecase

import (
	"errors"
	"math/rand"
	"time"

	"github.com/hoanglong/chat/backend/core-api/internal/domain"
)

const ucLetterBytes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateInviteCode(n int) string {
	b := make([]byte, n)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = ucLetterBytes[rng.Intn(len(ucLetterBytes))]
	}
	return string(b)
}

type workspaceUseCase struct {
	workspaceRepo domain.WorkspaceRepository
}

func NewWorkspaceUseCase(workspaceRepo domain.WorkspaceRepository) domain.WorkspaceUseCase {
	return &workspaceUseCase{workspaceRepo: workspaceRepo}
}

func (u *workspaceUseCase) Create(userID string, req *domain.CreateWorkspaceReq) (*domain.Workspace, error) {
	if req.Name == "" {
		return nil, errors.New("workspace name is required")
	}

	workspace := &domain.Workspace{
		Name:    req.Name,
		OwnerID: userID,
	}

	err := u.workspaceRepo.Create(workspace)
	if err != nil {
		return nil, err
	}

	return workspace, nil
}

func (u *workspaceUseCase) List(userID string) ([]domain.Workspace, error) {
	return u.workspaceRepo.ListForUser(userID)
}

func (u *workspaceUseCase) GetByID(workspaceID string) (*domain.Workspace, error) {
	return u.workspaceRepo.GetByID(workspaceID)
}

func (u *workspaceUseCase) Join(userID string, workspaceID string) error {
	// Check if workspace exists
	ws, err := u.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return err
	}
	if ws == nil {
		return errors.New("workspace not found")
	}

	// Check if already a member
	existingMember, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if existingMember != nil {
		return errors.New("user is already a member of this workspace")
	}

	member := &domain.WorkspaceMember{
		WorkspaceID: workspaceID,
		UserID:      userID,
		Role:        "member",
		JoinedAt:    time.Now(),
	}

	return u.workspaceRepo.AddMember(member)
}

func (u *workspaceUseCase) GetMember(workspaceID, userID string) (*domain.WorkspaceMember, error) {
	return u.workspaceRepo.GetMember(workspaceID, userID)
}

func (u *workspaceUseCase) ListMembers(userID string, workspaceID string) ([]domain.WorkspaceMember, error) {
	// Check if user is a member of the workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	return u.workspaceRepo.ListMembers(workspaceID)
}

func (u *workspaceUseCase) GetOrCreateDMChannel(userID string, workspaceID string, recipientID string) (*domain.DMChannel, error) {
	// Check if user is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	// Check if recipient is member of workspace
	recipientMember, err := u.workspaceRepo.GetMember(workspaceID, recipientID)
	if err != nil {
		return nil, err
	}
	if recipientMember == nil {
		return nil, errors.New("recipient is not a member of this workspace")
	}

	// Retrieve if exists
	existing, err := u.workspaceRepo.GetDMChannel(workspaceID, userID, recipientID)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return u.workspaceRepo.GetDMChannelByID(existing.ID)
	}

	// Create new DM channel
	dm := &domain.DMChannel{
		WorkspaceID: workspaceID,
		UserOneID:   userID,
		UserTwoID:   recipientID,
	}

	err = u.workspaceRepo.CreateDMChannel(dm)
	if err != nil {
		return nil, err
	}

	return u.workspaceRepo.GetDMChannelByID(dm.ID)
}

func (u *workspaceUseCase) GetDMChannelByID(id string) (*domain.DMChannel, error) {
	return u.workspaceRepo.GetDMChannelByID(id)
}

func (u *workspaceUseCase) ListDMChannels(userID string, workspaceID string) ([]domain.DMChannel, error) {
	// Check if user is member of workspace
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	return u.workspaceRepo.ListDMChannelsForUser(workspaceID, userID)
}

func (u *workspaceUseCase) Update(userID, workspaceID string, req *domain.UpdateWorkspaceReq) (*domain.Workspace, error) {
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return nil, err
	}
	if member == nil {
		return nil, errors.New("access denied: you are not a member of this workspace")
	}

	if member.Role != "owner" && member.Role != "admin" {
		return nil, errors.New("only owner or admin can update workspace settings")
	}

	workspace, err := u.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return nil, err
	}
	if workspace == nil {
		return nil, errors.New("workspace not found")
	}

	workspace.Name = req.Name
	err = u.workspaceRepo.Update(workspace)
	if err != nil {
		return nil, err
	}

	return workspace, nil
}

func (u *workspaceUseCase) Delete(userID, workspaceID string) error {
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("access denied: you are not a member of this workspace")
	}

	if member.Role != "owner" {
		return errors.New("only the owner can delete this workspace")
	}

	return u.workspaceRepo.Delete(workspaceID)
}

func (u *workspaceUseCase) JoinByInviteCode(userID string, inviteCode string) (*domain.Workspace, error) {
	workspace, err := u.workspaceRepo.GetByInviteCode(inviteCode)
	if err != nil {
		return nil, err
	}
	if workspace == nil {
		return nil, errors.New("invalid invite code")
	}

	// Check if already a member
	existingMember, err := u.workspaceRepo.GetMember(workspace.ID, userID)
	if err != nil {
		return nil, err
	}
	if existingMember != nil {
		return workspace, nil // Already member, just return workspace success
	}

	member := &domain.WorkspaceMember{
		WorkspaceID: workspace.ID,
		UserID:      userID,
		Role:        "member",
		JoinedAt:    time.Now(),
	}

	err = u.workspaceRepo.AddMember(member)
	if err != nil {
		return nil, err
	}

	return workspace, nil
}

func (u *workspaceUseCase) Leave(userID string, workspaceID string) error {
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if member == nil {
		return errors.New("you are not a member of this workspace")
	}

	if member.Role == "owner" {
		return errors.New("the owner cannot leave the workspace. Please transfer ownership or delete the workspace instead")
	}

	return u.workspaceRepo.RemoveMember(workspaceID, userID)
}

func (u *workspaceUseCase) UpdateMemberRole(userID, workspaceID, memberID, role string) error {
	if role != "admin" && role != "member" && role != "owner" {
		return errors.New("invalid role")
	}

	currMember, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if currMember == nil || currMember.Role != "owner" {
		return errors.New("only the owner can modify member roles")
	}

	targetMember, err := u.workspaceRepo.GetMember(workspaceID, memberID)
	if err != nil {
		return err
	}
	if targetMember == nil {
		return errors.New("target user is not a member of this workspace")
	}

	if role == "owner" {
		// Transfer ownership
		workspace, err := u.workspaceRepo.GetByID(workspaceID)
		if err != nil {
			return err
		}
		if workspace == nil {
			return errors.New("workspace not found")
		}

		workspace.OwnerID = memberID
		err = u.workspaceRepo.Update(workspace)
		if err != nil {
			return err
		}

		// Promote target to owner
		err = u.workspaceRepo.UpdateMemberRole(workspaceID, memberID, "owner")
		if err != nil {
			return err
		}

		// Demote self to admin
		return u.workspaceRepo.UpdateMemberRole(workspaceID, userID, "admin")
	}

	if targetMember.Role == "owner" {
		return errors.New("cannot demote the owner directly. Transfer ownership instead")
	}

	return u.workspaceRepo.UpdateMemberRole(workspaceID, memberID, role)
}

func (u *workspaceUseCase) KickMember(userID, workspaceID, memberID string) error {
	currMember, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return err
	}
	if currMember == nil {
		return errors.New("access denied")
	}

	targetMember, err := u.workspaceRepo.GetMember(workspaceID, memberID)
	if err != nil {
		return err
	}
	if targetMember == nil {
		return errors.New("target user is not a member of this workspace")
	}

	if memberID == userID {
		return errors.New("cannot kick yourself. Use leave workspace instead")
	}

	// Owner can kick anyone except themselves
	// Admin can kick members only
	// Member cannot kick anyone
	if currMember.Role == "owner" {
		return u.workspaceRepo.RemoveMember(workspaceID, memberID)
	} else if currMember.Role == "admin" {
		if targetMember.Role == "owner" || targetMember.Role == "admin" {
			return errors.New("admins cannot kick other admins or the owner")
		}
		return u.workspaceRepo.RemoveMember(workspaceID, memberID)
	}

	return errors.New("you do not have permission to kick members")
}

func (u *workspaceUseCase) RegenerateInviteCode(userID, workspaceID string) (string, error) {
	member, err := u.workspaceRepo.GetMember(workspaceID, userID)
	if err != nil {
		return "", err
	}
	if member == nil || (member.Role != "owner" && member.Role != "admin") {
		return "", errors.New("only owner or admin can regenerate the invite code")
	}

	workspace, err := u.workspaceRepo.GetByID(workspaceID)
	if err != nil {
		return "", err
	}
	if workspace == nil {
		return "", errors.New("workspace not found")
	}

	newCode := generateInviteCode(8)
	workspace.InviteCode = newCode
	err = u.workspaceRepo.Update(workspace)
	if err != nil {
		return "", err
	}

	return newCode, nil
}
