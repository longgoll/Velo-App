🏛️ Tổng Quan Kiến Trúc Microservices (5 Dịch Vụ Cốt Lõi)
Hệ thống của bạn sẽ được chia nhỏ thành các microservices độc lập, giao tiếp với nhau qua gRPC (cho đồng bộ), Message Queue (cho bất đồng bộ) và WebRTC (cho truyền tải media thời gian thực).

[ Client (Web/Mobile) ]
│
├─── (HTTP/REST) ──────> [ 1. Auth & Core API Service ] (Golang)
│                          │ (gRPC)
├─── (WebSockets) ─────> [ 2. Gateway Service ] (Rust) <──(NATS/Valkey)──> [ Event Bus / Signaling ]
│
└─── (WebRTC/Media) ───> [ 3. Media SFU Service (LiveKit) ] (Golang) <──> [ 4. TURN/STUN (Coturn) ]
│
├──> [ 5. Media & Upload Service ] (Golang)
└──> [ 6. Notification Service ] (Golang)

1. Gateway Service (Ngôn ngữ: Rust + Tokio/Axum)
   Nhiệm vụ: Là cửa ngõ duy nhất giữ kết nối WebSocket với tất cả client online. Nó không xử lý logic nghiệp vụ, không ghi DB. Nó làm 3 việc: Nhận tin nhắn từ client đẩy vào Message Queue, nhận tin nhắn từ Message Queue đẩy ngược về cho client, và làm trung gian chuyển tiếp tín hiệu cuộc gọi (WebRTC Signaling).

Tại sao dùng Rust: Giữ hàng trăm nghìn kết nối WebSocket duy trì liên tục mà tiêu tốn cực ít RAM, không bị lag do dọn rác (Garbage Collection).

2. Auth & Core API Service (Ngôn ngữ: Golang + Fiber)
   Nhiệm vụ: Xử lý các tác vụ CRUD thông thường và logic nặng: Đăng ký/Đăng nhập (dùng PASETO token), tạo Server, tạo Channel, quản lý phân quyền thành viên, cấu hình cài đặt. Đồng thời xác thực quyền tạo/tham gia phòng gọi của user.

Database: Kết nối trực tiếp với PostgreSQL để đảm bảo dữ liệu quan hệ chặt chẽ.

3. Media & Upload Service (Ngôn ngữ: Golang + Fiber)
   Nhiệm vụ: Chuyên trách xử lý file. Khi client muốn up file, service này sẽ sinh ra Presigned URL kết nối tới SeaweedFS. Sau đó, nó lắng nghe sự kiện file đã up xong để thực hiện tối ưu hóa (nén ảnh, tạo ảnh thumbnail, kiểm tra mã độc) một cách bất đồng bộ để không làm chậm luồng chat.

4. Background & Notification Service (Ngôn ngữ: Golang hoặc Node.js)
   Nhiệm vụ: Tiêu thụ các sự kiện từ Message Queue để gửi Push Notification (Firebase), gửi Email xác nhận, hoặc lưu trữ lịch sử tin nhắn vào database phụ nếu cần.

5. Call & Media SFU Service (Công nghệ: LiveKit - Golang)
   Nhiệm vụ: Làm máy chủ SFU (Selective Forwarding Unit) để xử lý việc truyền/nhận và định tuyến các luồng âm thanh/video cho các cuộc gọi nhóm hoặc kênh voice (giống Discord Voice Channel) mà không làm tốn băng thông upload của client.

📨 Thiết Kế Hàng Đợi (Message Queue) & Trục Sự Kiện (Event Bus)
Để tối ưu chi phí hạ tầng xuống mức $0 khi chạy local/self-host, chúng ta sẽ thiết kế một lớp trừu tượng (Abstraction Layer) cho Message Queue:

Chế độ Mặc định (Cho Self-host / Cấu hình thấp): Sử dụng chính Valkey Streams hoặc NATS.io (NATS được viết bằng Go, cực kỳ nhẹ, chỉ tốn vài chục MB RAM nhưng tốc độ nhanh khủng khiếp, hỗ trợ cả cơ chế Pub/Sub lẫn Message Queue).

Chế độ Enterprise (Khi scale lớn): Người dùng chỉ cần bật cấu hình QUEUE_DRIVER=kafka trong file .env, hệ thống sẽ tự động chuyển sang dùng cụm Apache Kafka hoặc Redpanda (một giải pháp thay thế Kafka bằng C++, nhanh và nhẹ hơn).

📞 Thiết Kế Hệ Thống Gọi Điện (Voice/Video Call - WebRTC)
Để hỗ trợ tính năng cuộc gọi 1-1 và phòng gọi nhóm (Voice Channels) hiệu năng cao, chúng ta tích hợp kiến trúc WebRTC kết hợp SFU:

*   **Đường truyền báo hiệu (Signaling Path):** Sử dụng các kết nối WebSocket hiện có qua **Rust Gateway**. Khi hai client cần kết nối cuộc gọi, chúng trao đổi các gói tin báo hiệu (SDP Offers, Answers, ICE Candidates) thông qua Gateway. Gateway định tuyến các gói tin này thông qua Valkey/NATS Pub/Sub để tìm đến đúng node mà client đích đang kết nối.
*   **Truyền tải âm thanh/video (Media Flow):**
    *   *Cuộc gọi 1-1:* Dữ liệu truyền trực tiếp giữa 2 client (Peer-to-Peer) để tiết kiệm băng thông cho server. Nếu bị chặn bởi tường lửa, dữ liệu sẽ đi qua **Coturn (STUN/TURN)**.
    *   *Cuộc gọi nhóm / Voice Channel:* Toàn bộ dữ liệu thoại và video sẽ được gửi về **LiveKit SFU Service**. LiveKit nhận luồng dữ liệu từ mỗi user và phân phối lại cho các thành viên khác trong phòng, tối ưu băng thông upload của client ở mức tối đa.

🛠️ Kế Hoạch Triển Khai Chi Tiết (Full Roadmap cùng AI)
Giai đoạn 1: Thiết lập nền móng & Trục giao tiếp (Tuần 1-2)
Nhiệm vụ cho AI:

"Viết một API Gateway bằng Rust (Axum) hỗ trợ WebSocket, tích hợp cơ chế chia sẻ trạng thái (State Sharing) qua Valkey."

"Tạo cấu trúc dự án Golang theo mô hình Clean Architecture cho Core API."

"Định nghĩa các file .proto (Protobuf) để tự động sinh code gRPC giao tiếp giữa Rust và Go."

Giai đoạn 2: Luồng Chat Thời Gian Thực & Xử Lý Sự Kiện (Tuần 3-4)
Thiết kế luồng đi của 1 tin nhắn:

Client gửi tin nhắn qua WebSocket tới Rust Gateway.

Rust Gateway nhận tin, đóng gói thành một Event và bắn vào Valkey Streams (hoặc NATS).

Core API Service (Go) và Notification Service lượm Event đó từ hàng đợi một cách bất đồng bộ.

Core API lưu tin nhắn vào PostgreSQL/ScyllaDB. Notification Service đẩy thông tin ra cho các user offline.

Đồng thời, Valkey Pub/Sub sẽ phát tán tin nhắn đó đến các node Rust Gateway khác để đẩy về máy tính của những người dùng đang online trực tiếp.

Giai đoạn 3: Hiện thực hóa Kiến trúc Up File Siêu Rẻ (Tuần 5)
Nhiệm vụ cho AI:

"Viết module Golang kết nối với SeaweedFS S3-API để sinh Presigned URL."

"Viết mã nguồn Front-end (Next.js) thực hiện upload file trực tiếp theo dạng Multi-part upload lên SeaweedFS bằng Presigned URL thu được."

Giai đoạn 4: Hiện thực hóa tính năng Gọi điện Real-time (Tuần 6)
Nhiệm vụ cho AI:

"Xây dựng luồng Signaling WebRTC thông qua Rust Gateway sử dụng NATS/Valkey Pub/Sub để định tuyến tin nhắn giữa các gateway node."

"Tích hợp SDK LiveKit Go vào Core API để quản lý việc tạo phòng gọi, xác thực quyền tham gia và sinh token bảo mật cho client."

"Viết mã nguồn Frontend (React) sử dụng LiveKit React SDK để kết nối vào Voice Channel, xử lý bật/tắt mic, camera, và hiển thị danh sách người dùng đang nói."

Giai đoạn 5: Đóng gói và Mở Rộng (Tuần 7)
Dockerize toàn bộ: Viết một file docker-compose.yml thần thánh. Khi người dùng muốn chạy dự án của bạn, họ chỉ cần gõ đúng một lệnh duy nhất: docker-compose up -d.

File này sẽ tự động kéo: Cụm app của bạn + PostgreSQL + Valkey + SeaweedFS + NATS + Coturn + LiveKit Server. Toàn bộ hạ tầng cơ bản có thể chạy cực kỳ mượt mà trên một con VPS giá rẻ chỉ với 2GB RAM nhờ tính gọn nhẹ của các dịch vụ viết bằng Go và Rust!
