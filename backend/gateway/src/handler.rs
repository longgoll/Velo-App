use axum::{
    extract::{ws::{Message, WebSocket, WebSocketUpgrade}, Query, State},
    response::IntoResponse,
};
use std::sync::Arc;
use serde::{Deserialize, Serialize};
use tracing::{info, warn, error};
use crate::client::GrpcClients;
use crate::queue::{QueueManager, ChatMessage, ChannelEvent};

use uuid::Uuid;
use futures_util::{StreamExt, SinkExt};

#[derive(Deserialize)]
pub struct WsParams {
    pub token: String,
}

#[derive(Deserialize, Debug)]
#[serde(tag = "type", content = "payload")]
pub enum ClientMsg {
    #[serde(rename = "subscribe")]
    Subscribe { channel_id: String },
    #[serde(rename = "send_message")]
    SendMessage { channel_id: String, content: String },

    #[serde(rename = "set_status")]
    SetStatus { status: String },
}

#[derive(Serialize, Clone)]
#[serde(tag = "type", content = "payload")]
pub enum ServerMsg {
    #[serde(rename = "subscribed")]
    Subscribed { channel_id: String },
    #[serde(rename = "message")]
    Message(ChatMessage),

    #[serde(rename = "user_status")]
    UserStatus { username: String, status: String },
    #[serde(rename = "online_list")]
    OnlineList(Vec<String>),
    #[serde(rename = "error")]
    Error { message: String },
}

#[derive(Clone)]
pub struct AppState {
    pub grpc_clients: GrpcClients,
    pub queue_manager: QueueManager,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    Query(params): Query<WsParams>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    // 1. Xác thực Token qua gRPC sang Go Core API
    match state.grpc_clients.verify_token(&params.token).await {
        Ok(res) if res.is_valid => {
            info!("User authenticated successfully via gRPC: {}", res.username);
            ws.on_upgrade(move |socket| handle_socket(socket, state, res.user_id, res.username))
        }
        _ => {
            warn!("Unauthorized connection attempt");
            axum::response::Response::builder()
                .status(401)
                .body(axum::body::Body::from("Unauthorized"))
                .unwrap()
        }
    }
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    user_id: String,
    username: String,
) {
    let (mut ws_sender, mut ws_receiver) = socket.split();

    // Channel truyền tin nhắn từ các task nền về cho WebSocket Writer
    let (tx_out, mut rx_out) = tokio::sync::mpsc::channel::<ServerMsg>(100);

    // 1. Gửi danh sách user online hiện tại cho client mới kết nối
    match state.queue_manager.get_online_users().await {
        Ok(users) => {
            let _ = tx_out.send(ServerMsg::OnlineList(users.clone())).await;

            // Gửi thông tin trạng thái chi tiết của từng online user đến client mới kết nối này
            let queue = state.queue_manager.clone();
            let tx_out_clone = tx_out.clone();
            tokio::spawn(async move {
                for user in users {
                    if let Ok(status) = queue.get_user_status(&user).await {
                        let _ = tx_out_clone.send(ServerMsg::UserStatus {
                            username: user,
                            status,
                        }).await;
                    }
                }
            });
        }
        Err(e) => {
            error!("Failed to get online users list from Valkey: {:?}", e);
        }
    }

    // 2. Phát trạng thái hiện tại của user này tới mọi người (mặc định là online nếu chưa có)
    let initial_status = match state.queue_manager.get_user_status(&username).await {
        Ok(s) => {
            if s == "offline" {
                "online".to_string()
            } else {
                s
            }
        }
        _ => "online".to_string(),
    };

    if let Err(e) = state.queue_manager.publish_presence(&username, &initial_status).await {
        error!("Failed to publish presence: {:?}", e);
    }

    // Writer Task: Nhận ServerMsg từ rx_out và gửi về client qua WebSocket
    let mut writer_task = tokio::spawn(async move {
        while let Some(msg) = rx_out.recv().await {
            let serialized = serde_json::to_string(&msg).unwrap();
            if let Err(e) = ws_sender.send(Message::Text(serialized)).await {
                error!("Failed to send message to WebSocket: {:?}", e);
                break;
            }
        }
    });

    // Reader Task & Subscription manager
    let user_id_clone = user_id.clone();
    let username_clone = username.clone();
    let state_clone = state.clone();
    let tx_out_clone = tx_out.clone();

    let mut reader_task = tokio::spawn(async move {
        // Lưu trữ các active subscription task cho client này
        let mut active_subs = std::collections::HashMap::new();

        // Tự động subscribe client này vào global:presence channel
        let mut rx_global_presence = state_clone.queue_manager.get_or_create_channel("global:presence");
        let tx_out_presence = tx_out_clone.clone();
        let sub_presence_task = tokio::spawn(async move {
            while let Ok(event) = rx_global_presence.recv().await {
                if let ChannelEvent::Presence(presence_msg) = event {
                    let _ = tx_out_presence.send(ServerMsg::UserStatus {
                        username: presence_msg.username,
                        status: presence_msg.status,
                    }).await;
                }
            }
        });
        active_subs.insert("global:presence".to_string(), sub_presence_task);

        while let Some(Ok(msg)) = ws_receiver.next().await {
            if let Message::Text(text) = msg {
                let client_msg: ClientMsg = match serde_json::from_str(&text) {
                    Ok(m) => m,
                    Err(_) => {
                        let _ = tx_out_clone.send(ServerMsg::Error { message: "Invalid JSON format".to_string() }).await;
                        continue;
                    }
                };

                match client_msg {
                    ClientMsg::Subscribe { channel_id } => {
                        // Kiểm tra quyền của user với channel qua gRPC
                        match state_clone.grpc_clients.check_channel_access(&user_id_clone, &channel_id).await {
                            Ok(res) if res.is_allowed => {
                                info!("User {} allowed to join channel {}", username_clone, channel_id);

                                if active_subs.contains_key(&channel_id) {
                                    continue;
                                }

                                // Đăng ký nhận tin nhắn từ broadcast channel (Valkey Pub/Sub)
                                let mut rx_broadcast = state_clone.queue_manager.get_or_create_channel(&channel_id);
                                let tx_out_local = tx_out_clone.clone();
                                let cid = channel_id.clone();

                                // Spawn task lắng nghe tin nhắn của channel này và chuyển tiếp sang tx_out
                                let sub_task = tokio::spawn(async move {
                                    while let Ok(event) = rx_broadcast.recv().await {
                                        match event {
                                            ChannelEvent::Message(chat_msg) => {
                                                let _ = tx_out_local.send(ServerMsg::Message(chat_msg)).await;
                                            }
                                            ChannelEvent::Presence(_) => {}

                                        }
                                    }
                                });

                                active_subs.insert(cid.clone(), sub_task);
                                let _ = tx_out_clone.send(ServerMsg::Subscribed { channel_id: cid }).await;
                            }
                            _ => {
                                let _ = tx_out_clone.send(ServerMsg::Error { message: format!("Access denied to channel {}", channel_id) }).await;
                            }
                        }
                    }
                    ClientMsg::SendMessage { channel_id, content } => {
                        // Kiểm tra quyền của user với channel qua gRPC trước khi cho gửi
                        match state_clone.grpc_clients.check_channel_access(&user_id_clone, &channel_id).await {
                            Ok(res) if res.is_allowed => {
                                let chat_msg = ChatMessage {
                                    id: Uuid::new_v4().to_string(),
                                    channel_id,
                                    user_id: user_id_clone.clone(),
                                    username: username_clone.clone(),
                                    content,
                                    timestamp: std::time::SystemTime::now()
                                        .duration_since(std::time::UNIX_EPOCH)
                                        .unwrap()
                                        .as_millis() as i64,
                                    reactions: None,
                                    message_type: None,
                                };

                                // Publish tin nhắn lên Valkey Pub/Sub
                                if let Err(e) = state_clone.queue_manager.publish_message(&chat_msg.channel_id, &chat_msg).await {
                                    error!("Failed to publish message: {:?}", e);
                                    let _ = tx_out_clone.send(ServerMsg::Error { message: "Failed to broadcast message".to_string() }).await;
                                }
                            }
                            _ => {
                                let _ = tx_out_clone.send(ServerMsg::Error { message: "Unauthorized to send messages".to_string() }).await;
                            }
                        }
                    }
                    ClientMsg::SetStatus { status } => {
                        if let Err(e) = state_clone.queue_manager.publish_presence(&username_clone, &status).await {
                            error!("Failed to publish presence change: {:?}", e);
                        }
                    }
                }
            }
        }

        // Dọn dẹp các task lắng nghe khi WebSocket đóng
        for (_, task) in active_subs {
            task.abort();
        }
    });

    // Đợi 1 trong 2 task kết thúc thì abort task còn lại
    tokio::select! {
        _ = &mut writer_task => reader_task.abort(),
        _ = &mut reader_task => writer_task.abort(),
    }

    // Phát trạng thái "offline" của user này tới mọi người khi kết nối đóng
    let state_cleanup = state.clone();
    let username_cleanup = username.clone();
    tokio::spawn(async move {
        if let Err(e) = state_cleanup.queue_manager.publish_presence(&username_cleanup, "offline").await {
            error!("Failed to publish offline presence: {:?}", e);
        }
    });

    info!("WebSocket connection closed for user: {}", username);
}
