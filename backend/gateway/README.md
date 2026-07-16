# API Gateway Service (Rust)

Dịch vụ Gateway chịu trách nhiệm giữ kết nối WebSocket dài lâu với Client, thực hiện định tuyến tin nhắn thời gian thực và đóng vai trò làm WebRTC Signaling server.

## Cấu trúc thư mục dự kiến
```text
gateway/
├── src/
│   ├── main.rs       # Điểm khởi chạy Axum server
│   ├── handler/      # Xử lý WebSocket & REST API
│   ├── client/       # Kết nối gRPC sang Go Core API
│   ├── queue/        # Kết nối Valkey/NATS (Pub/Sub & Streams)
│   └── config.rs     # Cấu hình môi trường
├── Cargo.toml        # Quản lý dependency của Rust
```
