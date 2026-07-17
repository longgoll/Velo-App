package domain

import "context"

type PresignUploadReq struct {
	Filename    string `json:"filename"`
	ContentType string `json:"content_type"`
	Size        int64  `json:"size"`
}

type PresignUploadRes struct {
	UploadURL   string `json:"upload_url"`
	DownloadURL string `json:"download_url"`
	Key         string `json:"key"`
}

type AttachmentUseCase interface {
	PresignUpload(ctx context.Context, userID string, req *PresignUploadReq) (*PresignUploadRes, error)
}
