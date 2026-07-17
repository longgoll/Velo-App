use std::sync::Arc;
use tokio::sync::broadcast;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tracing::{info, error};
use dashmap::DashMap;
use futures_util::StreamExt;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ChatMessage {
    pub id: String,
    pub channel_id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub timestamp: i64,
    #[serde(default)]
    pub reactions: Option<serde_json::Value>,
    #[serde(rename = "type", default)]
    pub message_type: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct TypingMessage {
    pub channel_id: String,
    pub username: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct PresenceMessage {
    pub username: String,
    pub status: String, // "online" or "offline"
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum ChannelEvent {
    #[serde(rename = "message")]
    Message(ChatMessage),
    #[serde(rename = "typing")]
    Typing(TypingMessage),
    #[serde(rename = "presence")]
    Presence(PresenceMessage),
}

#[derive(Clone)]
pub struct QueueManager {
    redis_client: redis::Client,
    // Map lưu trữ broadcast channel cho từng chat channel_id
    // Giúp phân phối message nhận được từ Valkey đến các WebSocket connections trên node này
    channels: Arc<DashMap<String, broadcast::Sender<ChannelEvent>>>,
}

impl QueueManager {
    pub fn new(redis_url: &str) -> Result<Self, redis::RedisError> {
        let redis_client = redis::Client::open(redis_url)?;
        Ok(Self {
            redis_client,
            channels: Arc::new(DashMap::new()),
        })
    }

    // Publish message lên Valkey Pub/Sub
    pub async fn publish_message(&self, channel_id: &str, msg: &ChatMessage) -> Result<(), redis::RedisError> {
        let mut conn = self.redis_client.get_multiplexed_tokio_connection().await?;
        let payload = serde_json::to_string(msg).unwrap();
        let pubsub_key = format!("chat:{}", channel_id);
        
        conn.publish::<_, _, ()>(pubsub_key, payload).await?;
        Ok(())
    }

    // Publish typing event lên Valkey Pub/Sub
    pub async fn publish_typing(&self, channel_id: &str, username: &str) -> Result<(), redis::RedisError> {
        let mut conn = self.redis_client.get_multiplexed_tokio_connection().await?;
        let msg = TypingMessage {
            channel_id: channel_id.to_string(),
            username: username.to_string(),
        };
        let payload = serde_json::to_string(&msg).unwrap();
        let pubsub_key = format!("typing:{}", channel_id);
        
        conn.publish::<_, _, ()>(pubsub_key, payload).await?;
        Ok(())
    }

    // Publish presence event lên Valkey
    pub async fn publish_presence(&self, username: &str, status: &str) -> Result<(), redis::RedisError> {
        let mut conn = self.redis_client.get_multiplexed_tokio_connection().await?;
        
        if status == "online" {
            conn.sadd::<_, _, ()>("online_users", username).await?;
        } else {
            conn.srem::<_, _, ()>("online_users", username).await?;
        }

        let msg = PresenceMessage {
            username: username.to_string(),
            status: status.to_string(),
        };
        let payload = serde_json::to_string(&msg).unwrap();
        
        conn.publish::<_, _, ()>("presence:global", payload).await?;
        Ok(())
    }

    // Lấy danh sách các user đang online hiện tại
    pub async fn get_online_users(&self) -> Result<Vec<String>, redis::RedisError> {
        let mut conn = self.redis_client.get_multiplexed_tokio_connection().await?;
        let members: Vec<String> = conn.smembers("online_users").await?;
        Ok(members)
    }

    // Lấy hoặc tạo mới broadcast sender cho một channel
    pub fn get_or_create_channel(&self, channel_id: &str) -> broadcast::Receiver<ChannelEvent> {
        let entry = self.channels.entry(channel_id.to_string()).or_insert_with(|| {
            let (tx, _) = broadcast::channel(100);
            tx
        });
        entry.subscribe()
    }

    // Vòng lặp lắng nghe Valkey Pub/Sub trong nền
    pub async fn start_listening(&self) -> Result<(), redis::RedisError> {
        let mut conn = self.redis_client.get_async_connection().await?;
        let mut pubsub = conn.into_pubsub();
        
        // Subscribe vào tất cả các kênh chat:*, typing:*, presence:*
        pubsub.psubscribe("chat:*").await?;
        pubsub.psubscribe("typing:*").await?;
        pubsub.psubscribe("presence:*").await?;
        info!("Successfully subscribed to Valkey Pub/Sub patterns: chat:*, typing:*, presence:*");

        let channels = self.channels.clone();

        tokio::spawn(async move {
            let mut stream = pubsub.on_message();
            while let Some(msg) = stream.next().await {
                let channel_name = msg.get_channel_name().to_string();
                let payload: String = match msg.get_payload::<String>() {
                    Ok(p) => p,
                    Err(e) => {
                        error!("Failed to get Valkey message payload: {:?}", e);
                        continue;
                    }
                };

                if channel_name.starts_with("chat:") {
                    if let Ok(chat_msg) = serde_json::from_str::<ChatMessage>(&payload) {
                        if let Some(tx) = channels.get(&chat_msg.channel_id) {
                            let _ = tx.send(ChannelEvent::Message(chat_msg));
                        }
                    }
                } else if channel_name.starts_with("typing:") {
                    if let Ok(typing_msg) = serde_json::from_str::<TypingMessage>(&payload) {
                        if let Some(tx) = channels.get(&typing_msg.channel_id) {
                            let _ = tx.send(ChannelEvent::Typing(typing_msg));
                        }
                    }
                } else if channel_name == "presence:global" {
                    if let Ok(presence_msg) = serde_json::from_str::<PresenceMessage>(&payload) {
                        if let Some(tx) = channels.get("global:presence") {
                            let _ = tx.send(ChannelEvent::Presence(presence_msg));
                        }
                    }
                }
            }
        });

        Ok(())
    }
}
