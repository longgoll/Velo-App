mod client;
mod queue;
mod handler;

use std::net::SocketAddr;
use std::sync::Arc;
use axum::{
    routing::get,
    Router,
};
use tower_http::cors::CorsLayer;
use tracing::{info, error};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::client::GrpcClients;
use crate::queue::QueueManager;
use crate::handler::{ws_handler, AppState};

#[tokio::main]
async fn main() {
    // 1. Khởi tạo logger
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // 2. Load biến môi trường từ .env
    if let Err(e) = dotenvy::dotenv() {
        info!("No .env file found, relying on system env variables: {:?}", e);
    }

    let port: u16 = std::env::var("GATEWAY_PORT")
        .unwrap_or_else(|_| "8081".to_string())
        .parse()
        .expect("GATEWAY_PORT must be a valid port number");

    let grpc_url = std::env::var("CORE_API_GRPC_URL")
        .unwrap_or_else(|_| "http://localhost:50051".to_string());

    let valkey_host = std::env::var("VALKEY_HOST").unwrap_or_else(|_| "localhost".to_string());
    let valkey_port = std::env::var("VALKEY_PORT").unwrap_or_else(|_| "6379".to_string());
    let valkey_url = format!("redis://{}:{}", valkey_host, valkey_port);

    info!("Initializing connection to Core API gRPC at: {}", grpc_url);
    let grpc_clients = match GrpcClients::new(&grpc_url).await {
        Ok(c) => c,
        Err(e) => {
            error!("Failed to connect to gRPC server: {:?}", e);
            std::process::exit(1);
        }
    };

    info!("Initializing connection to Valkey at: {}", valkey_url);
    let queue_manager = match QueueManager::new(&valkey_url) {
        Ok(q) => q,
        Err(e) => {
            error!("Failed to connect to Valkey: {:?}", e);
            std::process::exit(1);
        }
    };

    // Khởi chạy vòng lặp lắng nghe Valkey Pub/Sub nền
    if let Err(e) = queue_manager.start_listening().await {
        error!("Failed to start Valkey Pub/Sub subscriber: {:?}", e);
        std::process::exit(1);
    }

    let app_state = Arc::new(AppState {
        grpc_clients,
        queue_manager,
    });

    // 3. Cấu hình Routes
    let app = Router::new()
        .route("/ws", get(ws_handler))
        .route("/health", get(|| async { "Gateway is healthy" }))
        .layer(CorsLayer::permissive())
        .with_state(app_state);

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("Gateway WebSocket Server running on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
