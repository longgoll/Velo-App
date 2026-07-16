# Core API Service (Golang)

Dịch vụ Core API xử lý logic nghiệp vụ chính của hệ thống chat, quản lý Authentication, CRUD Server/Channel/User, kết nối trực tiếp PostgreSQL và định nghĩa các APIs gRPC server phục vụ cho Gateway.

## Cấu trúc thư mục (Clean Architecture)
```text
core-api/
├── cmd/             # Điểm chạy ứng dụng (main.go)
├── internal/        # Mã nguồn nghiệp vụ nội bộ
│   ├── domain/      # Định nghĩa struct dữ liệu, interface nghiệp vụ
│   ├── repository/  # Tầng kết nối database (PostgreSQL)
│   ├── usecase/     # Tầng xử lý logic nghiệp vụ (Business Logic)
│   └── delivery/    # Tầng giao diện API (REST API Fiber, gRPC Server)
├── config/          # Đọc file môi trường .env và cấu hình hệ thống
└── pkg/             # Các thư viện bổ trợ dùng chung
```
