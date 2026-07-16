package scylla

import (
	"log"
	"strconv"
	"strings"
	"time"

	"github.com/gocql/gocql"
	"github.com/hoanglong/chat/backend/core-api/config"
)

func InitScyllaDB(cfg *config.Config) *gocql.Session {
	hosts := strings.Split(cfg.ScyllaHosts, ",")
	for i, host := range hosts {
		// Extract hostname without port if needed, or leave it as gocql handles ip/port.
		// gocql expects hostname/ip. If port is present in host, gocql.NewCluster might parse it, 
		// but typically gocql configures port separately (cluster.Port = 9042).
		// Let's strip port if present and set port.
		hosts[i] = strings.TrimSpace(host)
	}

	var parsedHosts []string
	port := 9042
	for _, h := range hosts {
		parts := strings.Split(h, ":")
		parsedHosts = append(parsedHosts, parts[0])
		if len(parts) > 1 {
			if val, err := strconv.Atoi(parts[1]); err == nil {
				port = val
			}
		}
	}

	cluster := gocql.NewCluster(parsedHosts...)
	cluster.Port = port
	cluster.Timeout = 5 * time.Second
	cluster.ConnectTimeout = 5 * time.Second
	cluster.Consistency = gocql.One

	var session *gocql.Session
	var err error
	maxRetries := 15

	for i := 1; i <= maxRetries; i++ {
		log.Printf("Connecting to ScyllaDB (attempt %d/%d)...\n", i, maxRetries)
		
		tempSession, errConn := cluster.CreateSession()
		if errConn == nil {
			// Create Keyspace
			createKeyspaceCQL := `CREATE KEYSPACE IF NOT EXISTS ` + cfg.ScyllaKeyspace + ` WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};`
			if err := tempSession.Query(createKeyspaceCQL).Exec(); err != nil {
				log.Printf("Warning: Failed to create keyspace: %v\n", err)
			} else {
				log.Printf("ScyllaDB Keyspace %s verified/created\n", cfg.ScyllaKeyspace)
			}
			tempSession.Close()

			// Connect with keyspace
			cluster.Keyspace = cfg.ScyllaKeyspace
			session, err = cluster.CreateSession()
			if err == nil {
				break
			}
			errConn = err
		}

		err = errConn
		log.Printf("ScyllaDB is not ready yet: %v. Retrying in 2 seconds...\n", err)
		time.Sleep(2 * time.Second)
	}

	if err != nil {
		log.Fatalf("Failed to establish ScyllaDB session after %d attempts: %v", maxRetries, err)
	}

	// Create Messages Table
	createTableCQL := `
	CREATE TABLE IF NOT EXISTS messages (
		channel_id text,
		timestamp timestamp,
		message_id text,
		user_id text,
		username text,
		content text,
		PRIMARY KEY ((channel_id), timestamp, message_id)
	) WITH CLUSTERING ORDER BY (timestamp DESC);`

	if err := session.Query(createTableCQL).Exec(); err != nil {
		log.Fatalf("Failed to create messages table in ScyllaDB: %v", err)
	}

	log.Println("ScyllaDB connection established and tables verified")
	return session
}
