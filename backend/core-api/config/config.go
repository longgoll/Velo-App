package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port               string
	Env                string
	DBHost             string
	DBPort             string
	DBUser             string
	DBPassword         string
	DBName             string
	DBSslMode          string
	ValkeyHost         string
	ValkeyPort         string
	NatsURL            string
	PasetoSymmetricKey string
	GrpcPort           string
}

func LoadConfig() *Config {
	// Load .env file from root of project or current dir
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	return &Config{
		Port:               getEnv("PORT", "8080"),
		Env:                getEnv("ENV", "development"),
		DBHost:             getEnv("DB_HOST", "localhost"),
		DBPort:             getEnv("DB_PORT", "5432"),
		DBUser:             getEnv("DB_USER", "postgres"),
		DBPassword:         getEnv("DB_PASSWORD", "postgres_password"),
		DBName:             getEnv("DB_NAME", "chat_db"),
		DBSslMode:          getEnv("DB_SSLMODE", "disable"),
		ValkeyHost:         getEnv("VALKEY_HOST", "localhost"),
		ValkeyPort:         getEnv("VALKEY_PORT", "6379"),
		NatsURL:            getEnv("NATS_URL", "nats://localhost:4222"),
		PasetoSymmetricKey: getEnv("PASETO_SYMMETRIC_KEY", "yellow-submarine-yellow-submarine"),
		GrpcPort:           getEnv("GRPC_PORT", "50051"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
