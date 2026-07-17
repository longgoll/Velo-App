package domain

import (
	"math/rand"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

const idLetterBytes = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

func generateRandomWorkspaceID(n int) string {
	b := make([]byte, n)
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	for i := range b {
		b[i] = idLetterBytes[rng.Intn(len(idLetterBytes))]
	}
	return string(b)
}

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
	ID         string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	Name       string         `gorm:"type:varchar(150);not null" json:"name"`
	OwnerID    string         `gorm:"type:varchar(36);not null" json:"owner_id"`
	InviteCode string         `gorm:"type:varchar(10);uniqueIndex" json:"invite_code"`
	Owner      User           `gorm:"foreignKey:OwnerID" json:"-"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
}

func (w *Workspace) BeforeCreate(tx *gorm.DB) (err error) {
	if w.ID == "" {
		w.ID = generateRandomWorkspaceID(8)
	}
	if w.InviteCode == "" {
		w.InviteCode = w.ID
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
	IsPrivate   bool           `gorm:"type:boolean;default:false;not null" json:"is_private"`
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

type ChannelMember struct {
	ChannelID string    `gorm:"primaryKey;type:varchar(36);index" json:"channel_id"`
	UserID    string    `gorm:"primaryKey;type:varchar(36);index" json:"user_id"`
	JoinedAt  time.Time `json:"joined_at"`
	User      User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type WorkspaceMember struct {
	WorkspaceID string    `gorm:"primaryKey;type:varchar(36)" json:"workspace_id"`
	UserID      string    `gorm:"primaryKey;type:varchar(36)" json:"user_id"`
	Role        string    `gorm:"type:varchar(50);default:'member'" json:"role"` // owner, admin, member
	JoinedAt    time.Time `json:"joined_at"`
	User        User      `gorm:"foreignKey:UserID" json:"user,omitempty"`
}

type DMChannel struct {
	ID          string         `gorm:"primaryKey;type:varchar(36)" json:"id"`
	WorkspaceID string         `gorm:"type:varchar(36);not null;index" json:"workspace_id"`
	UserOneID   string         `gorm:"type:varchar(36);not null;index" json:"user_one_id"`
	UserTwoID   string         `gorm:"type:varchar(36);not null;index" json:"user_two_id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`

	UserOne User `gorm:"foreignKey:UserOneID" json:"user_one,omitempty"`
	UserTwo User `gorm:"foreignKey:UserTwoID" json:"user_two,omitempty"`
}

func (dm *DMChannel) BeforeCreate(tx *gorm.DB) (err error) {
	if dm.ID == "" {
		dm.ID = uuid.New().String()
	}
	return
}
