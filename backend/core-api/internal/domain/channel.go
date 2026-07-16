package domain

type CreateChannelReq struct {
	Name string      `json:"name" validate:"required"`
	Type ChannelType `json:"type" validate:"required,oneof=text voice"`
}

type ChannelRepository interface {
	Create(channel *Channel) error
	GetByID(id string) (*Channel, error)
	ListForWorkspace(workspaceID string) ([]Channel, error)
}

type CallParticipant struct {
	Identity string `json:"identity"`
	Name     string `json:"name"`
	State    string `json:"state"`
}

type ChannelUseCase interface {
	Create(userID string, workspaceID string, req *CreateChannelReq) (*Channel, error)
	List(userID string, workspaceID string) ([]Channel, error)
	GetByID(channelID string) (*Channel, error)
	GenerateCallToken(userID string, username string, workspaceID string, channelID string) (string, string, error)
	GetCallParticipants(userID string, workspaceID string, channelID string) ([]CallParticipant, error)
}
