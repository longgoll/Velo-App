package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID        string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Username  string         `gorm:"uniqueIndex;type:varchar(100);not null" json:"username"`
	Email     string         `gorm:"uniqueIndex;type:varchar(150);not null" json:"email"`
	Password  string         `gorm:"type:varchar(255);not null" json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (u *User) BeforeCreate(tx *gorm.DB) (err error) {
	if u.ID == "" {
		u.ID = uuid.New().String()
	}
	return
}

type Workspace struct {
	ID        string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name      string         `gorm:"type:varchar(150);not null" json:"name"`
	OwnerID   string         `gorm:"type:varchar(36);not null" json:"owner_id"`
	Owner     User           `gorm:"foreignKey:OwnerID" json:"-"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

func (w *Workspace) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	return
}

type ChannelType string

const (
	ChannelTypeText  ChannelType = "text"
	ChannelTypeVoice ChannelType = "voice"
)

type Channel struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	WorkspaceID string         `gorm:"type:varchar(36);not null;index" json:"workspace_id"`
	Name        string         `gorm:"type:varchar(100);not null" json:"name"`
	Type        ChannelType    `gorm:"type:varchar(20);default:'text'" json:"type"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

func (c *Channel) BeforeCreate(tx *gorm.DB) (err error) {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	return
}

type WorkspaceMember struct {
	WorkspaceID string    `gorm:"primaryKey;type:varchar(36)" json:"workspace_id"`
	UserID      string    `gorm:"primaryKey;type:varchar(36)" json:"user_id"`
	Role        string    `gorm:"type:varchar(50);default:'member'" json:"role"` // owner, admin, member
	JoinedAt    time.Time `json:"joined_at"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}
