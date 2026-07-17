import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import axios from 'axios';
import type { ChatMessage } from '@/types';

// Helper function to compress images before upload
const compressImage = (file: File): Promise<File> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('image/') || file.type.includes('gif')) {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        const MAX_DIM = 1280;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(file);

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return resolve(file);
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            if (compressedFile.size >= file.size) {
              resolve(file);
            } else {
              resolve(compressedFile);
            }
          },
          'image/jpeg',
          0.75
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
};

interface UseChatFileUploadProps {
  activeChannelId: string | null;
  currentUser: any;
  onSendMessage: (channelId: string, content: string) => void;
}

export function useChatFileUpload({
  activeChannelId,
  currentUser,
  onSendMessage,
}: UseChatFileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const queryClient = useQueryClient();

  const uploadFile = async (rawFile: File) => {
    if (!activeChannelId) return;
    const file = await compressImage(rawFile);
    const fileId = `upload-${Date.now()}`;

    // Add inline progress message
    const progressMessage: ChatMessage & { uploadProgress?: number; fileName?: string; isUploading?: boolean } = {
      id: fileId,
      channel_id: activeChannelId,
      user_id: currentUser?.id || 'me',
      username: currentUser?.username || 'Me',
      content: `[uploading:${file.name}]`,
      timestamp: Date.now(),
      uploadProgress: 0,
      fileName: file.name,
      isUploading: true,
    };

    // ✅ Helper to update messages in both InfiniteQuery and legacy format
    const updateQueryData = (
      updater: (messages: any[]) => any[]
    ) => {
      queryClient.setQueryData(['messages', activeChannelId], (oldData: any) => {
        if (!oldData) return oldData;
        if (oldData.pages) {
          // InfiniteQuery — apply to last page
          const pages = [...oldData.pages];
          const lastIdx = pages.length - 1;
          pages[lastIdx] = updater(pages[lastIdx] || []);
          return { ...oldData, pages };
        }
        return updater(oldData || []);
      });
    };

    // Append progress message
    queryClient.setQueryData(['messages', activeChannelId], (oldData: any) => {
      if (!oldData) {
        return { pages: [[progressMessage]], pageParams: [undefined] };
      }
      if (oldData.pages) {
        const pages = [...oldData.pages];
        const lastIdx = pages.length - 1;
        pages[lastIdx] = [...(pages[lastIdx] || []), progressMessage];
        return { ...oldData, pages };
      }
      return [...(oldData || []), progressMessage];
    });

    try {
      // 1. Request presigned URL from Go Core API
      const presignRes = await api.post('/attachments/presign', {
        filename: file.name,
        content_type: file.type,
        size: file.size,
      });

      const { upload_url, download_url } = presignRes.data;

      // 2. Upload file directly to SeaweedFS S3-API
      await axios.put(upload_url, file, {
        headers: {
          'Content-Type': file.type,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateQueryData((msgs) =>
              msgs.map((m: any) =>
                m.id === fileId ? { ...m, uploadProgress: progress } : m
              )
            );
          }
        },
      });

      // 3. Format message based on file type
      const isImage = file.type.startsWith('image/');
      const finalContent = isImage
        ? `[image:${file.name}:${download_url}]`
        : `[file:${file.name}:${download_url}:${(file.size / 1024).toFixed(1)} KB]`;

      // 4. Update the local progress message state to complete
      updateQueryData((msgs) =>
        msgs.map((m: any) =>
          m.id === fileId
            ? { ...m, content: finalContent, isUploading: false, uploadProgress: undefined }
            : m
        )
      );

      // 5. Send message over WebSocket
      onSendMessage(activeChannelId, finalContent);
    } catch (err: any) {
      console.error('File upload failed:', err);
      // Remove progress message on failure
      updateQueryData((msgs) => msgs.filter((m: any) => m.id !== fileId));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0 || !activeChannelId) return;
    uploadFile(files[0]);
  };

  return {
    isDragging,
    uploadFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
