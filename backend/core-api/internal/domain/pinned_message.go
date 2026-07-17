package domain

type PinnedMessageRepository interface {
	Pin(pin *PinnedMessage) error
	Unpin(channelID string, pinID string) error
	ListByChannel(channelID string) ([]PinnedMessage, error)
	IsAlreadyPinned(channelID string, messageID string) (bool, error)
}

type PinnedMessageUseCase interface {
	Pin(userID, channelID, messageID, content, username string) (*PinnedMessage, error)
	Unpin(userID, channelID, pinID string) error
	ListByChannel(userID, channelID string) ([]PinnedMessage, error)
}
