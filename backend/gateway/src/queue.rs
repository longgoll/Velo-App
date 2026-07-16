use std::sync::Arc;
use tokio::sync::broadcast;
use redis::AsyncCommands;
use serde::{Deserialize, Serialize};
use tracing::{info, error};
use dashmap::DashMap;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct ChatMessage {
    pub id: String,
    pub channel_id: String,
    pub user_id: String,
    pub username: String,
    pub content: String,
    pub timestamp: i64,
}

#[derive(Clone)]
pub struct QueueManager {
    redis_client: redis::Client,
    // Map lưu trữ broadcast channel cho từng chat channel_id
    // Giúp phân phối message nhận được từ Valkey đến các WebSocket connections trên node này
    channels: Arc<DashMap<String, broadcast::Sender<ChatMessage>>>,
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

    // Lấy hoặc tạo mới broadcast sender cho một channel
    pub fn get_or_create_channel(&self, channel_id: &str) -> broadcast::Receiver<ChatMessage> {
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
        
        // Subscribe vào tất cả các kênh dạng chat:*
        pubsub.psubscribe("chat:*").await?;
        info!("Successfully subscribed to Valkey Pub/Sub pattern: chat:*");

        let channels = self.channels.clone();

        tokio::spawn(async move {
            let mut stream = pubsub.on_message();
            while let Some(msg) = stream.next().await {
                let payload: String = match msg.get_payload() {
                    Ok(p) => p,
                    Err(e) => {
                        error!("Failed to get Valkey message payload: {:?}", e);
                        continue;
                    }
                };

                let chat_msg: ChatMessage = match serde_json::from_str(&payload) {
                    Ok(m) => m,
                    Err(e) => {
                        error!("Failed to parse message JSON: {:?}", e);
                        continue;
                    }
                };

                // Phân phối message đến các WebSocket đang lắng nghe channel này trên node hiện tại
                if let Some(tx) = channels.get(&chat_msg.channel_id) {
                    let _ = tx.send(chat_msg);
                }
            }
        });

        Ok(())
    }
}
