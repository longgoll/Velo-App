import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store/useChatStore';

interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: number;
}

export const useWebSocket = (token: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { activeChannelId } = useChatStore();

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8081'}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      
      // Nếu đang ở channel nào thì subscribe channel đó ngay
      if (activeChannelId) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel_id: activeChannelId }
        }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WS message received:', data);

        if (data.type === 'message') {
          const chatMsg: ChatMessage = data.payload;
          
          // Cập nhật ngầm dữ liệu cache của TanStack Query cho channel tương ứng
          queryClient.setQueryData(['messages', chatMsg.channel_id], (oldMessages: ChatMessage[] | undefined) => {
            if (!oldMessages) return [chatMsg];
            // Tránh duplicate tin nhắn nếu đã có
            if (oldMessages.some(m => m.id === chatMsg.id)) return oldMessages;
            return [...oldMessages, chatMsg];
          });
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed, reconnecting in 3s...');
      setTimeout(() => connect(), 3000);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    socketRef.current = ws;
  }, [token, activeChannelId, queryClient]);

  // Connect khi token thay đổi
  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // Subscribe vào channel mới khi channel thay đổi
  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN && activeChannelId) {
      socketRef.current.send(JSON.stringify({
        type: 'subscribe',
        payload: { channel_id: activeChannelId }
      }));
    }
  }, [activeChannelId]);

  // Hàm gửi tin nhắn
  const sendMessage = useCallback((channelId: string, content: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'send_message',
        payload: { channel_id: channelId, content }
      }));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return { sendMessage };
};
