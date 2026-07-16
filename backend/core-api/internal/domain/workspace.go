package domain

type CreateWorkspaceReq struct {
	Name string `json:"name" validate:"required"`
}

type UpdateWorkspaceReq struct {
	Name string `json:"name" validate:"required"`
}

type UpdateMemberRoleReq struct {
	Role string `json:"role" validate:"required"`
}

type JoinByInviteCodeReq struct {
	InviteCode string `json:"invite_code" validate:"required"`
}

type WorkspaceRepository interface {
	Create(workspace *Workspace) error
	Update(workspace *Workspace) error
	Delete(id string) error
	GetByID(id string) (*Workspace, error)
	GetByInviteCode(code string) (*Workspace, error)
	ListForUser(userID string) ([]Workspace, error)
	AddMember(member *WorkspaceMember) error
	GetMember(workspaceID, userID string) (*WorkspaceMember, error)
	UpdateMemberRole(workspaceID, userID, role string) error
	RemoveMember(workspaceID, userID string) error
	ListMembers(workspaceID string) ([]WorkspaceMember, error)
	CreateDMChannel(dm *DMChannel) error
	GetDMChannel(workspaceID, userOneID, userTwoID string) (*DMChannel, error)
	GetDMChannelByID(id string) (*DMChannel, error)
	ListDMChannelsForUser(workspaceID, userID string) ([]DMChannel, error)
}

type WorkspaceUseCase interface {
	Create(userID string, req *CreateWorkspaceReq) (*Workspace, error)
	Update(userID, workspaceID string, req *UpdateWorkspaceReq) (*Workspace, error)
	Delete(userID, workspaceID string) error
	List(userID string) ([]Workspace, error)
	GetByID(workspaceID string) (*Workspace, error)
	Join(userID string, workspaceID string) error
	JoinByInviteCode(userID string, inviteCode string) (*Workspace, error)
	Leave(userID string, workspaceID string) error
	GetMember(workspaceID, userID string) (*WorkspaceMember, error)
	UpdateMemberRole(userID, workspaceID, memberID, role string) error
	KickMember(userID, workspaceID, memberID string) error
	ListMembers(userID string, workspaceID string) ([]WorkspaceMember, error)
	RegenerateInviteCode(userID, workspaceID string) (string, error)
	GetOrCreateDMChannel(userID string, workspaceID string, recipientID string) (*DMChannel, error)
	GetDMChannelByID(id string) (*DMChannel, error)
	ListDMChannels(userID string, workspaceID string) ([]DMChannel, error)
}
