package usecase

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hoanglong/chat/backend/core-api/internal/domain"
	"github.com/minio/minio-go/v7"
)

type attachmentUseCase struct {
	minioClient *minio.Client
	bucketName  string
	s3Endpoint  string
}

func NewAttachmentUseCase(minioClient *minio.Client, bucketName string, s3Endpoint string) domain.AttachmentUseCase {
	return &attachmentUseCase{
		minioClient: minioClient,
		bucketName:  bucketName,
		s3Endpoint:  s3Endpoint,
	}
}

func (u *attachmentUseCase) PresignUpload(ctx context.Context, userID string, req *domain.PresignUploadReq) (*domain.PresignUploadRes, error) {
	// 1. Generate unique file key: attachments/YYYYMMDD/[uuid]-[filename]
	dateStr := time.Now().Format("20060102")
	uniqueID := uuid.New().String()
	safeFilename := strings.ReplaceAll(req.Filename, " ", "_")
	objectKey := fmt.Sprintf("attachments/%s/%s-%s", dateStr, uniqueID, safeFilename)

	// 2. Generate presigned PUT URL
	expiry := time.Hour * 1

	presignedURL, err := u.minioClient.PresignedPutObject(ctx, u.bucketName, objectKey, expiry)
	if err != nil {
		return nil, fmt.Errorf("failed to generate presigned URL: %w", err)
	}

	// 3. Format the public download URL
	endpoint := strings.TrimSuffix(u.s3Endpoint, "/")
	downloadURL := fmt.Sprintf("%s/%s/%s", endpoint, u.bucketName, objectKey)

	return &domain.PresignUploadRes{
		UploadURL:   presignedURL.String(),
		DownloadURL: downloadURL,
		Key:         objectKey,
	}, nil
}
