package domain

type CreateWorkspaceReq struct {
	Name string `json:"name" validate:"required"`
}

type WorkspaceRepository interface {
	Create(workspace *Workspace) error
	GetByID(id string) (*Workspace, error)
	ListForUser(userID string) ([]Workspace, error)
	AddMember(member *WorkspaceMember) error
	GetMember(workspaceID, userID string) (*WorkspaceMember, error)
	ListMembers(workspaceID string) ([]WorkspaceMember, error)
	CreateDMChannel(dm *DMChannel) error
	GetDMChannel(workspaceID, userOneID, userTwoID string) (*DMChannel, error)
	GetDMChannelByID(id string) (*DMChannel, error)
	ListDMChannelsForUser(workspaceID, userID string) ([]DMChannel, error)
}

type WorkspaceUseCase interface {
	Create(userID string, req *CreateWorkspaceReq) (*Workspace, error)
	List(userID string) ([]Workspace, error)
	GetByID(workspaceID string) (*Workspace, error)
	Join(userID string, workspaceID string) error
	GetMember(workspaceID, userID string) (*WorkspaceMember, error)
	ListMembers(userID string, workspaceID string) ([]WorkspaceMember, error)
	GetOrCreateDMChannel(userID string, workspaceID string, recipientID string) (*DMChannel, error)
	GetDMChannelByID(id string) (*DMChannel, error)
	ListDMChannels(userID string, workspaceID string) ([]DMChannel, error)
}
