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
}

type WorkspaceUseCase interface {
	Create(userID string, req *CreateWorkspaceReq) (*Workspace, error)
	List(userID string) ([]Workspace, error)
	GetByID(workspaceID string) (*Workspace, error)
	Join(userID string, workspaceID string) error
	GetMember(workspaceID, userID string) (*WorkspaceMember, error)
}
