-- Create Keyspace
CREATE KEYSPACE IF NOT EXISTS chat_messages 
WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1};

-- Create Messages Table
CREATE TABLE IF NOT EXISTS chat_messages.messages (
    channel_id text,
    timestamp timestamp,
    message_id text,
    user_id text,
    username text,
    content text,
    PRIMARY KEY ((channel_id), timestamp, message_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);
