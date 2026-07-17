import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import axios from 'axios';
import { Hash, PhoneCall, Video, MessageSquare, Upload, Sparkles, Plus, Compass, Layers, ArrowDown } from 'lucide-react';
import type { Channel, ChatMessage, Workspace, DMChannel } from '@/types';
import MessageItem from './MessageItem';
import ThreadSidebar from './ThreadSidebar';
import ChatInput from './ChatInput';
import DynamicIslandCall from '../../../components/ui/DynamicIslandCall';
import VoiceRoomView from './VoiceRoomView';
import { useVoiceCall } from '@/context/VoiceCallContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import AllMessagesDashboard from './AllMessagesDashboard';

interface ChatViewportProps {
  onSendMessage: (channelId: string, content: string) => void;
}

export default function ChatViewport({ onSendMessage }: ChatViewportProps) {
  const { 
    activeWorkspaceId, 
    activeChannelId, 
    explorerOpen, 
    toggleExplorer, 
    activeVoiceChannelId,
    setShowCreateWs,
    setShowJoinWs,
    setShowCreateChan,
    unreadChannels,
    activeFilter,
    voiceMuted,
    voiceDeafened,
    setVoiceMuted,
    setVoiceDeafened,
    setActiveVoiceChannelId,
    setActiveChannelId
  } = useChatStore();

  const {
    participants,
    isConnected,
    isConnecting,
    toggleCamera,
    toggleScreenShare,
    disconnectCall
  } = useVoiceCall();

  const parentRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Scroll and unread optimization states
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [firstUnreadMsgId, setFirstUnreadMsgId] = useState<string | null>(null);
  const isAtBottom = useRef(true);
  const prevMessagesLength = useRef(0);
  const prevChannelId = useRef<string | null>(null);

  // Retrieve current user from local storage
  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Fetch workspaces (cached from queryClient)
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  // Fetch channels list to find active channel name
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Fetch active DM channels
  const { data: dmChannels = [] } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const activeDmChannel = dmChannels.find((d) => d.id === activeChannelId);
  const isVoiceOrDm = !!activeDmChannel || (!!activeChannel && activeChannel.type === 'voice');

  // Fetch active call participants for the current channel to show status banner
  const { data: callParticipants = [] } = useQuery<any[]>({
    queryKey: ['call-participants', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId || !activeWorkspaceId) return [];
      try {
        const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${activeChannelId}/participants`);
        return res.data;
      } catch (e) {
        return [];
      }
    },
    enabled: !!activeChannelId && !!activeWorkspaceId && isVoiceOrDm,
    refetchInterval: 3000, // Poll every 3 seconds to keep call banner and indicators snappy
  });

  // Fetch messages from ScyllaDB history via Core API
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['messages', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];
      
      const res = await api.get(`/channels/${activeChannelId}/messages?limit=50`);
      const msgs = res.data as ChatMessage[];
      return [...msgs].reverse();
    },
    enabled: !!activeChannelId,
  });

  // Intercept sending messages to handle reply prefixes
  const handleSendMessage = (channelId: string, content: string) => {
    onSendMessage(channelId, content);
  };

  const handleStartVoiceCall = () => {
    if (!activeChannelId) return;
    useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
    handleSendMessage(activeChannelId, '[call:voice:active]');
  };

  const handleStartVideoCall = () => {
    if (!activeChannelId) return;
    useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
    handleSendMessage(activeChannelId, '[call:video:active]');
  };

  // Send a threaded reply message
  const handleSendThreadReply = (content: string) => {
    if (!activeThreadMessage || !activeChannelId) return;

    const replyContent = `[reply:${activeThreadMessage.id}:${activeThreadMessage.username}] ${content}`;
    onSendMessage(activeChannelId, replyContent);
  };

  const uploadFile = async (file: File) => {
    if (!activeChannelId) return;
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

    queryClient.setQueryData(['messages', activeChannelId], (old: any) => {
      return [...(old || []), progressMessage];
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
            queryClient.setQueryData(['messages', activeChannelId], (old: any) => {
              return (old || []).map((m: any) => {
                if (m.id === fileId) {
                  return { ...m, uploadProgress: progress };
                }
                return m;
              });
            });
          }
        },
      });

      // 3. Format message based on file type
      const isImage = file.type.startsWith('image/');
      const finalContent = isImage
        ? `[image:${file.name}:${download_url}]`
        : `[file:${file.name}:${download_url}:${(file.size / 1024).toFixed(1)} KB]`;

      // 4. Update the local progress message state to complete
      queryClient.setQueryData(['messages', activeChannelId], (old: any) => {
        return (old || []).map((m: any) => {
          if (m.id === fileId) {
            return {
              ...m,
              content: finalContent,
              isUploading: false,
              uploadProgress: undefined,
            };
          }
          return m;
        });
      });

      // 5. Send message over WebSocket
      onSendMessage(activeChannelId, finalContent);
    } catch (err: any) {
      console.error('File upload failed:', err);
      // Remove progress message on failure
      queryClient.setQueryData(['messages', activeChannelId], (old: any) => {
        return (old || []).filter((m: any) => m.id !== fileId);
      });
    }
  };

  // Drag and Drop handlers
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

  // Build message tree for replies
  const buildMessageTree = () => {
    type ExtendedMsg = ChatMessage & { replies?: ExtendedMsg[]; parentId?: string; parentUsername?: string };
    const rootMessages: ExtendedMsg[] = [];
    const messageMap: Record<string, ChatMessage & { replies: ExtendedMsg[]; parentId?: string; parentUsername?: string }> = {};
    const parentMap: Record<string, string> = {}; // childId -> parentId

    // 1. Initialize messageMap with copies and parse parents
    messages.forEach((msg) => {
      const replyMatch = msg.content.match(/^\[reply:([^:]+):([^\]]+)\]\s*(.*)/);
      if (replyMatch) {
        const [_, parentId, parentUsername, actualContent] = replyMatch;
        parentMap[msg.id] = parentId;
        messageMap[msg.id] = {
          ...msg,
          content: actualContent,
          parentId,
          parentUsername,
          replies: []
        };
      } else {
        messageMap[msg.id] = {
          ...msg,
          replies: []
        };
      }
    });

    // Helper to find the root parent ID in the thread
    const findRootParentId = (childId: string): string => {
      let currentId = childId;
      const visited = new Set<string>();
      while (parentMap[currentId] && !visited.has(currentId)) {
        visited.add(currentId);
        currentId = parentMap[currentId];
      }
      return currentId;
    };

    // 2. Build the hierarchy by flattening under root parents
    messages.forEach((msg) => {
      const mappedMsg = messageMap[msg.id];
      if (!mappedMsg) return;

      if (mappedMsg.parentId) {
        const rootParentId = findRootParentId(msg.id);
        if (messageMap[rootParentId]) {
          messageMap[rootParentId].replies.push(mappedMsg);
        } else {
          // Root parent not found in active messages, treat as root but with reply headers
          rootMessages.push(mappedMsg);
        }
      } else {
        rootMessages.push(mappedMsg);
      }
    });

    return rootMessages;
  };

  const structuredMessages = buildMessageTree();

  const firstUnreadMsg = messages.find((m) => m.id === firstUnreadMsgId);
  const unreadTimestamp = firstUnreadMsg ? firstUnreadMsg.timestamp : null;

  const activeThreadMessage = activeThreadId 
    ? structuredMessages.find(m => m.id === activeThreadId)
    : null;

  // Initialize TanStack React Virtual for virtualization
  const rowVirtualizer = useVirtualizer({
    count: structuredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 75,
  });

  // Scroll to bottom helper
  const scrollToBottom = () => {
    if (parentRef.current && structuredMessages.length > 0) {
      rowVirtualizer.scrollToIndex(structuredMessages.length - 1, { align: 'end', behavior: 'smooth' });
    }
    setShowNewMessagesBadge(false);
    isAtBottom.current = true;
  };

  // Handle scroll events directly on container
  const handleScroll = () => {
    const container = parentRef.current;
    if (!container) return;
    const threshold = 120; // threshold from bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    isAtBottom.current = isNearBottom;
    if (isNearBottom) {
      setShowNewMessagesBadge(false);
    }
  };

  // On active channel change, autoscroll to bottom instantly, auto-focus input, and clear unread badge
  useEffect(() => {
    if (activeChannelId) {
      isAtBottom.current = true;
      setShowNewMessagesBadge(false);
      setFirstUnreadMsgId(null);
      setActiveThreadId(null); // Clear active thread on channel navigation
      
      // Auto-focus the chat input textarea/input
      setTimeout(() => {
        const inputEl = document.querySelector('input[placeholder^="Gửi tin nhắn đến"]') as HTMLInputElement;
        if (inputEl) {
          inputEl.focus();
        }
      }, 50);

      // Scroll to bottom instantly
      setTimeout(() => {
        if (parentRef.current) {
          parentRef.current.scrollTop = parentRef.current.scrollHeight;
        }
      }, 50);
    }
  }, [activeChannelId]);

  // Calculate the first unread message ID when messages load or change
  useEffect(() => {
    if (activeChannelId) {
      const unreadCount = unreadChannels[activeChannelId] || 0;
      if (unreadCount > 0 && messages.length > 0) {
        const index = Math.max(0, messages.length - unreadCount);
        const firstUnread = messages[index];
        if (firstUnread) {
          setFirstUnreadMsgId(firstUnread.id);
        }
      }
    }
  }, [activeChannelId, messages, unreadChannels]);

  // Track height changes and auto scroll if was at bottom (e.g. sidebar toggle or resize)
  useEffect(() => {
    const container = parentRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      if (isAtBottom.current) {
        container.scrollTop = container.scrollHeight;
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Auto Scroll to Bottom on new messages or trigger badge (preventing jump when reading history)
  useEffect(() => {
    // If channel changed, just sync the refs and do nothing (handled by activeChannelId effect)
    if (activeChannelId !== prevChannelId.current) {
      prevChannelId.current = activeChannelId;
      prevMessagesLength.current = messages.length;
      return;
    }

    // If new messages arrived in the same channel
    if (messages.length > prevMessagesLength.current) {
      const lastRawMessage = messages[messages.length - 1];
      const isReply = lastRawMessage && lastRawMessage.content.match(/^\[reply:/);

      // Suppress scroll changes on incoming thread replies
      if (!isReply && structuredMessages.length > 0) {
        const lastMessage = structuredMessages[structuredMessages.length - 1];
        const isSentByMe = lastMessage.user_id === (currentUser?.id || 'me');

        if (isSentByMe || isAtBottom.current) {
          rowVirtualizer.scrollToIndex(structuredMessages.length - 1, { align: 'end', behavior: 'smooth' });
          setShowNewMessagesBadge(false);
        } else {
          setShowNewMessagesBadge(true);
        }
      }
    }
    
    // Always sync the length ref
    prevMessagesLength.current = messages.length;
  }, [messages.length, activeChannelId, structuredMessages, currentUser]);

  if (activeFilter === 'all' && !activeChannelId) {
    return <AllMessagesDashboard onSendMessage={handleSendMessage} />;
  }

  if (activeChannel && activeChannel.type === 'voice') {
    return (
      <div className="flex-1 bg-zinc-950 flex flex-row h-full min-w-0 relative animate-in fade-in duration-200">
        <VoiceRoomView
          channelName={activeChannel.name}
          participants={participants}
          isConnected={isConnected}
          isConnecting={isConnecting}
          voiceMuted={voiceMuted}
          voiceDeafened={voiceDeafened}
          onToggleMic={() => setVoiceMuted(!voiceMuted)}
          onToggleCamera={() => toggleCamera()}
          onToggleScreenShare={() => toggleScreenShare()}
          onDisconnect={() => disconnectCall()}
          onToggleDeafen={() => setVoiceDeafened(!voiceDeafened)}
          onJoinCall={() => setActiveVoiceChannelId(activeChannel.id)}
          onBackToChat={() => {
            const firstText = channels.find((c) => c.type === 'text');
            if (firstText) {
              setActiveChannelId(firstText.id);
            }
          }}
          apiParticipants={callParticipants}
        />
      </div>
    );
  }

  if (!activeChannelId) {
    const hasWorkspaces = workspaces.length > 0;
    
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center select-none relative overflow-hidden">
        {/* Ambient background glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-violet-500/5 blur-[80px] pointer-events-none" />

        {/* Dynamic Island Voice call in case user navigates here */}
        {activeVoiceChannelId && <DynamicIslandCall />}
        
        {!hasWorkspaces ? (
          /* Premium Onboarding state for brand new users */
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-tight">Chào mừng đến với Antigravity!</h3>
            <p className="text-zinc-400 text-xs mt-2.5 mb-8 leading-relaxed">
              Bắt đầu hành trình trò chuyện của bạn bằng cách tạo một không gian làm việc mới hoặc gia nhập không gian hiện có qua mã ID.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => setShowCreateWs(true)}
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
              >
                <Plus className="w-4 h-4" />
                Tạo không gian mới
              </button>
              
              <button
                onClick={() => setShowJoinWs(true)}
                className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-300 font-semibold py-3 px-5 rounded-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Compass className="w-4 h-4" />
                Gia nhập không gian có sẵn
              </button>
            </div>
          </div>
        ) : activeWorkspaceId && channels.length === 0 ? (
          /* Active workspace has no channels state */
          <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-center justify-center text-zinc-400 mb-6 mx-auto">
              <Layers className="w-8 h-8 text-indigo-400" />
            </div>
            
            <h3 className="text-xl font-bold text-white tracking-tight">Không gian của bạn còn trống</h3>
            <p className="text-zinc-400 text-xs mt-2.5 mb-8 leading-relaxed">
              Workspace này hiện tại chưa có kênh liên lạc nào. Hãy tạo kênh trò chuyện đầu tiên để bắt đầu kết nối với mọi người.
            </p>

            <button
              onClick={() => setShowCreateChan(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
            >
              <Plus className="w-4 h-4" />
              Tạo kênh trò chuyện đầu tiên
            </button>
          </div>
        ) : (
          /* Default state when workspaces exist but none/no-channel is selected */
          <div className="max-w-sm relative z-10 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-zinc-900/80 border border-zinc-850 rounded-2xl flex items-center justify-center text-zinc-500 mb-5 mx-auto">
              <MessageSquare className="w-8 h-8 text-indigo-500/70" />
            </div>
            <h3 className="text-lg font-bold text-white">Chọn Workspace hoặc Kênh để bắt đầu</h3>
            <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
              Chọn một Workspace ở sidebar bên trái và chọn kênh chat bất kỳ từ Content Explorer để bắt đầu thảo luận.
            </p>
          </div>
        )}
      </div>
    );
  }

  // Get active channel or DM title
  let chatTitle = 'Kênh chat';
  if (activeDmChannel) {
    const otherUser = activeDmChannel.user_one_id === currentUser?.id ? activeDmChannel.user_two : activeDmChannel.user_one;
    chatTitle = otherUser?.username || 'Trò chuyện';
  } else if (activeChannel) {
    chatTitle = activeChannel.name;
  }

  return (
    <div 
      className="flex-1 bg-zinc-900 flex flex-row h-full min-w-0 relative animate-in fade-in duration-200"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Main Chat Feed Area */}
      <div className="flex-1 flex flex-col justify-between min-w-0 h-full relative">
        {/* 1. Drag and Drop overlay */}
        {isDragging && (
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-md border-2 border-dashed border-indigo-500/40 m-3 rounded-2xl flex flex-col items-center justify-center gap-4 z-50 animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Upload className="w-8 h-8 animate-bounce" />
            </div>
            <div className="text-center">
              <h3 className="text-sm font-bold text-white">Thả tệp tin vào đây</h3>
              <p className="text-zinc-500 text-xs mt-1">Tải lên trực tiếp thông qua SeaweedFS</p>
            </div>
          </div>
        )}

        {/* 2. Dynamic Island Persistent Voice widget (only shown when Sidebar is hidden) */}
        {activeVoiceChannelId && !explorerOpen && (activeVoiceChannelId !== activeChannelId || activeChannel?.type !== 'voice') && (
          <DynamicIslandCall />
        )}

        {/* Chat Header */}
        <div className="px-6 h-[52px] border-b border-zinc-950/80 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md shadow-sm shrink-0 z-10">
          <div className="flex items-center gap-2 min-w-0">
            {activeDmChannel ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            ) : (
              <Hash className="w-5 h-5 text-zinc-500 shrink-0" />
            )}
            <span className="font-bold text-white text-sm truncate">
              {chatTitle}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {activeDmChannel && (
              <>
                <button
                  onClick={handleStartVoiceCall}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
                  title="Bắt đầu cuộc gọi thoại"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>
                <button
                  onClick={handleStartVideoCall}
                  className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
                  title="Bắt đầu cuộc gọi video"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={toggleExplorer}
              className="px-3 py-1 bg-zinc-800/80 text-xs text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition outline-none border-0 cursor-pointer"
              title="Ctrl + B"
            >
              {explorerOpen ? 'Ẩn Sidebar' : 'Hiện Sidebar'}
            </button>
          </div>
        </div>

        {/* 3. Active call indicator banner (for Text & DM channels) */}
        {callParticipants.length > 0 && activeVoiceChannelId !== activeChannelId && (
          <div className="mx-6 mt-3 px-4 py-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between backdrop-blur-md shadow-md animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Cuộc gọi thoại đang diễn ra</div>
                <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
                  Đang trong cuộc gọi: {callParticipants.map((p: any) => p.name || p.identity).join(', ')}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
              }}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer border-0 active:scale-95 shadow-md shadow-emerald-600/15"
            >
              Tham gia
            </button>
          </div>
        )}

        {/* Virtualized Message List */}
        <div 
          ref={parentRef}
          onScroll={handleScroll}
          className="flex-1 px-6 py-4 overflow-y-auto no-scrollbar"
        >
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const msg = structuredMessages[virtualRow.index];
              const isUnreadStart = msg.id === firstUnreadMsgId;

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="py-1 flex flex-col"
                >
                  {isUnreadStart && (
                    <div className="flex items-center gap-2 my-2 select-none animate-in fade-in slide-in-from-top-1 duration-200 shrink-0">
                      <div className="flex-1 h-[1px] bg-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                      <span className="text-[10px] font-bold text-rose-500 tracking-wider uppercase bg-zinc-900 px-2 py-0.5 rounded border border-rose-500/20 shadow-sm shadow-rose-500/10 shrink-0">
                        Tin nhắn mới chưa đọc
                      </span>
                      <div className="flex-1 h-[1px] bg-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                    </div>
                  )}
                  <MessageItem 
                    msg={msg} 
                    onReplyClick={(message) => {
                      let currentMsg = message;
                      const visited = new Set<string>();
                      
                      while (currentMsg && !visited.has(currentMsg.id)) {
                        visited.add(currentMsg.id);
                        const match = currentMsg.content.match(/^\[reply:([^:]+):/);
                        if (match) {
                          const parentId = match[1];
                          const parentMsg = messages.find(m => m.id === parentId);
                          if (parentMsg) {
                            currentMsg = parentMsg;
                          } else {
                            break;
                          }
                        } else {
                          break;
                        }
                      }
                      setActiveThreadId(currentMsg.id);
                    }}
                    unreadTimestamp={unreadTimestamp}
                    isActiveThread={activeThreadId === msg.id}
                  />
                </div>
              );
            })}
          </div>
          
          {structuredMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 select-none">
              <p className="text-xs">Bắt đầu cuộc trò chuyện tại #{chatTitle}</p>
            </div>
          )}
        </div>

        {/* Floating New Messages Badge */}
        {showNewMessagesBadge && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold py-2 px-4 rounded-full shadow-lg shadow-indigo-500/20 border border-indigo-400/30 backdrop-blur-md transition-all duration-200 flex items-center gap-1.5 z-20 cursor-pointer animate-bounce outline-none"
          >
            <span>Tin nhắn mới ở phía dưới</span>
            <ArrowDown className="w-3.5 h-3.5 animate-pulse" />
          </button>
        )}

        {/* Chat Input */}
        <ChatInput
          activeChannelId={activeChannelId}
          channelName={chatTitle}
          onSendMessage={handleSendMessage}
          onFileUpload={uploadFile}
        />
      </div>

      {/* Thread Sidebar Panel */}
      {activeThreadMessage && (
        <ThreadSidebar
          parentMessage={activeThreadMessage}
          onClose={() => setActiveThreadId(null)}
          onSendReply={handleSendThreadReply}
          currentUser={currentUser}
          unreadTimestamp={unreadTimestamp}
        />
      )}
    </div>
  );
}
