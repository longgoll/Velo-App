package domain

type CreateChannelReq struct {
	Name      string      `json:"name" validate:"required"`
	Type      ChannelType `json:"type" validate:"required,oneof=text voice"`
	IsPrivate bool        `json:"is_private"`
}

type UpdateChannelReq struct {
	Name string `json:"name" validate:"required"`
}

type ChannelRepository interface {
	Create(channel *Channel) error
	GetByID(id string) (*Channel, error)
	ListForWorkspace(workspaceID string) ([]Channel, error)
	Update(channel *Channel) error
	Delete(id string) error
	AddMember(channelID string, userID string) error
	RemoveMember(channelID string, userID string) error
	ListMembers(channelID string) ([]ChannelMember, error)
	IsMember(channelID string, userID string) (bool, error)
	ListPrivateChannelIDsForUser(workspaceID string, userID string) ([]string, error)
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
	Update(userID string, workspaceID string, channelID string, req *UpdateChannelReq) (*Channel, error)
	Delete(userID string, workspaceID string, channelID string) error
	AddMember(userID string, workspaceID string, channelID string, targetUserID string) error
	RemoveMember(userID string, workspaceID string, channelID string, targetUserID string) error
	ListMembers(userID string, workspaceID string, channelID string) ([]ChannelMember, error)
	IsMember(channelID string, userID string) (bool, error)
}
