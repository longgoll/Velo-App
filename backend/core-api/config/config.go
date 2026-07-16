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
	ScyllaHosts        string
	ScyllaKeyspace     string
	LiveKitURL         string
	LiveKitApiKey      string
	LiveKitApiSecret   string
}

func LoadConfig() *Config {
	// Load .env file from root of project or current dir
	err := godotenv.Load()
	if err != nil {
		// Try loading from root folder (two levels up)
		err = godotenv.Load("../../.env")
		if err != nil {
			log.Println("No .env file found, using system environment variables")
		}
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
		PasetoSymmetricKey: getEnv("PASETO_SYMMETRIC_KEY", "yellow-submarine-yellow-submarin"),
		GrpcPort:           getEnv("GRPC_PORT", "50051"),
		ScyllaHosts:        getEnv("SCYLLA_HOSTS", "localhost:9042"),
		ScyllaKeyspace:     getEnv("SCYLLA_KEYSPACE", "chat_messages"),
		LiveKitURL:         getEnv("LIVEKIT_URL", "http://localhost:7880"),
		LiveKitApiKey:      getEnv("LIVEKIT_API_KEY", "devkey"),
		LiveKitApiSecret:   getEnv("LIVEKIT_API_SECRET", "secret"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
