package postgres

import (
	"fmt"
	"log"

	"github.com/hoanglong/chat/backend/core-api/config"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=%s",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort, cfg.DBSslMode)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to PostgreSQL database: %v", err)
	}

	log.Println("Database connection established successfully")

	// Run Auto Migrations
	err = db.AutoMigrate(
		&domain.User{},
		&domain.Workspace{},
		&domain.Channel{},
		&domain.WorkspaceMember{},
		&domain.DMChannel{},
	)
	if err != nil {
		log.Fatalf("Failed to run database migrations: %v", err)
	}

	log.Println("Database auto-migration completed successfully")
	return db
}
