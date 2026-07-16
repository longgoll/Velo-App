package domain

type RegisterReq struct {
	Username string `json:"username" validate:"required"`
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required,min=6"`
}

type LoginReq struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type AuthRes struct {
	Token    string `json:"token"`
	User     *User  `json:"user"`
}

type UserRepository interface {
	Create(user *User) error
	GetByEmail(email string) (*User, error)
	GetByID(id string) (*User, error)
}

type UserUseCase interface {
	Register(req *RegisterReq) (*AuthRes, error)
	Login(req *LoginReq) (*AuthRes, error)
}
