import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '../store/useChatStore';

interface ChatMessage {
  id: string;
  channel_id: string;
  user_id: string;
  username: string;
  content: string;
  timestamp: string | number;
  reactions?: any[];
  type?: string;
}

export const useWebSocket = (token: string | null) => {
  const socketRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { activeChannelId } = useChatStore();
  const activeChannelIdRef = useRef(activeChannelId);
  const subscribedChannelsRef = useRef<Set<string>>(new Set());

  // Keep ref updated
  useEffect(() => {
    activeChannelIdRef.current = activeChannelId;
  }, [activeChannelId]);

  const subscribeToAllChannels = useCallback(() => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const queryCache = queryClient.getQueryCache();
    
    // Get channels and DMs from query cache
    const channelQueries = queryCache.findAll({ queryKey: ['channels'] });
    const dmQueries = queryCache.findAll({ queryKey: ['dms'] });

    const channelIds: string[] = [];

    for (const q of channelQueries) {
      const channels = q.state.data as any[];
      if (Array.isArray(channels)) {
        for (const c of channels) {
          if (c && c.id) {
            channelIds.push(c.id);
          }
        }
      }
    }

    for (const q of dmQueries) {
      const dms = q.state.data as any[];
      if (Array.isArray(dms)) {
        for (const d of dms) {
          if (d && d.id) {
            channelIds.push(d.id);
          }
        }
      }
    }

    // Also include activeChannelId
    if (activeChannelIdRef.current) {
      channelIds.push(activeChannelIdRef.current);
    }

    // Subscribe to each channel that isn't already subscribed
    channelIds.forEach((id) => {
      if (!subscribedChannelsRef.current.has(id)) {
        ws.send(JSON.stringify({
          type: 'subscribe',
          payload: { channel_id: id }
        }));
        subscribedChannelsRef.current.add(id);
        console.log('Subscribed to channel via WS:', id);
      }
    });
  }, [queryClient]);

  const connect = useCallback(() => {
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:8081'}/ws?token=${token}`;
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      if (socketRef.current !== ws) return;
      console.log('WebSocket connected successfully');
      subscribeToAllChannels();
    };

    ws.onmessage = (event) => {
      if (socketRef.current !== ws) return;
      try {
        const data = JSON.parse(event.data);
        console.log('WS message received:', data);

        if (data.type === 'message') {
          const chatMsg: ChatMessage = data.payload;
          const isReactionUpdate = chatMsg.type === 'reaction';

          // Detect incoming call messages
          const isCallMsg = !isReactionUpdate && !!chatMsg.content.match(/^\[call:(voice|video):active\]/);
          const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

          if (isCallMsg && chatMsg.user_id !== currentUser?.id) {
            const isVideo = chatMsg.content.includes('video');
            const activeVoiceId = useChatStore.getState().activeVoiceChannelId;
            if (!activeVoiceId) {
              useChatStore.getState().setIncomingCall({
                channelId: chatMsg.channel_id,
                callerName: chatMsg.username,
                isVideo
              });
            }
          }
          
          // Cập nhật ngầm dữ liệu cache của TanStack Query cho channel tương ứng
          queryClient.setQueryData(['messages', chatMsg.channel_id], (oldMessages: ChatMessage[] | undefined) => {
            if (!oldMessages) return isReactionUpdate ? undefined : [chatMsg];
            // Tránh duplicate tin nhắn, nhưng cập nhật nội dung nếu có thay đổi (ví dụ: ảnh thumbnail)
            if (oldMessages.some(m => m.id === chatMsg.id)) {
              return oldMessages.map(m => m.id === chatMsg.id ? chatMsg : m);
            }

            if (isReactionUpdate) {
              return oldMessages;
            }

            // Check if there is an optimistic upload message to replace
            const uploadIndex = oldMessages.findIndex(m => 
              m.id.startsWith('upload-') && 
              (m.content === chatMsg.content || chatMsg.content.includes(m.content.replace('[uploading:', '').replace(']', '')))
            );
            if (uploadIndex !== -1) {
              const updated = [...oldMessages];
              updated[uploadIndex] = chatMsg;
              return updated;
            }

            return [...oldMessages, chatMsg];
          });

          // Tìm workspace_id và type từ cache của React Query
          const queryCache = queryClient.getQueryCache();
          const channelQueries = queryCache.findAll({ queryKey: ['channels'] });
          let wsId = '';
          let convType: 'channel' | 'dm' = 'channel';
          
          for (const q of channelQueries) {
            const channels = q.state.data as any[];
            if (Array.isArray(channels) && channels.some(c => c.id === chatMsg.channel_id)) {
              wsId = q.queryKey[1] as string;
              convType = 'channel';
              break;
            }
          }
          
          if (!wsId) {
            const dmQueries = queryCache.findAll({ queryKey: ['dms'] });
            for (const q of dmQueries) {
              const dms = q.state.data as any[];
              if (Array.isArray(dms) && dms.some(d => d.id === chatMsg.channel_id)) {
                wsId = q.queryKey[1] as string;
                convType = 'dm';
                break;
              }
            }
          }
          
          if (wsId) {
            useChatStore.getState().addRecentConversation(chatMsg.channel_id, convType, wsId);
          }

          // Xử lý thông báo khi nhận tin ở kênh không hoạt động
          if (!isReactionUpdate && chatMsg.channel_id !== activeChannelIdRef.current) {
            useChatStore.getState().incrementUnread(chatMsg.channel_id);

            // Bắn Native Browser Notification nếu tab đang ẩn và có quyền
            if (
              'Notification' in window &&
              Notification.permission === 'granted' &&
              document.visibilityState === 'hidden'
            ) {
              new Notification(`#${chatMsg.username}`, {
                body: chatMsg.content,
              });
            }
          }
        } else if (data.type === 'typing') {
          const { channel_id, username } = data.payload;
          useChatStore.getState().setTypingUser(channel_id, username, Date.now());
        } else if (data.type === 'online_list') {
          useChatStore.getState().setOnlineUsers(data.payload);
        } else if (data.type === 'user_status') {
          const { username, status } = data.payload;
          useChatStore.getState().setUserPresence(username, status);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err);
      }
    };

    ws.onclose = () => {
      if (socketRef.current !== ws) return;
      console.log('WebSocket connection closed, reconnecting in 3s...');
      subscribedChannelsRef.current.clear();
      setTimeout(() => {
        if (socketRef.current === ws) {
          connect();
        }
      }, 3000);
    };

    ws.onerror = (err) => {
      if (socketRef.current !== ws) return;
      console.error('WebSocket error:', err);
    };
  }, [token, queryClient, subscribeToAllChannels]);

  // Connect khi token thay đổi
  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        const ws = socketRef.current;
        socketRef.current = null;
        ws.close();
      }
      subscribedChannelsRef.current.clear();
    };
  }, [token, connect]);

  // Listen to TanStack queryCache updates to subscribe to newly loaded channels/DMs
  useEffect(() => {
    if (!token) return;

    const queryCache = queryClient.getQueryCache();
    const unsubscribe = queryCache.subscribe((event) => {
      if (event.type === 'updated' && event.query.state.status === 'success') {
        const key = event.query.queryKey;
        if (key[0] === 'channels' || key[0] === 'dms') {
          subscribeToAllChannels();
        }
      }
    });

    return () => unsubscribe();
  }, [token, queryClient, subscribeToAllChannels]);

  // Subscribe into new channel when activeChannelId changes
  useEffect(() => {
    subscribeToAllChannels();
  }, [activeChannelId, subscribeToAllChannels]);

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

  // Hàm báo đang gõ chữ
  const sendTyping = useCallback((channelId: string) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({
        type: 'typing',
        payload: { channel_id: channelId }
      }));
    }
  }, []);

  // Yêu cầu quyền thông báo từ trình duyệt khi khởi chạy
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return { sendMessage, sendTyping };
};
