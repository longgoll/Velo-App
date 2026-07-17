import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import api from '@/lib/api';
import { Upload, ArrowDown, Loader2 } from 'lucide-react';
import type { Channel, ChatMessage, Workspace, DMChannel, WorkspaceMember } from '@/types';
import MessageItem from './MessageItem';
import ThreadSidebar from './ThreadSidebar';
import DetailsSidebar from './DetailsSidebar';
import SearchPanel from './SearchPanel';
import NotificationPanel from './NotificationPanel';
import PinnedMessagesPanel from './PinnedMessagesPanel';
import ChatInput from './ChatInput';
import DynamicIslandCall from '../../../components/ui/DynamicIslandCall';
import VoiceRoomView from './VoiceRoomView';
import DMCallRoomView from './DMCallRoomView';
import { useVoiceCall } from '@/context/VoiceCallContext';
import { useVirtualizer } from '@tanstack/react-virtual';
import AllMessagesDashboard from './AllMessagesDashboard';
import { buildMessageTree } from '../utils/messageTree';
import { useChatFileUpload } from '../hooks/useChatFileUpload';
import ChatViewportPlaceholders from './ChatViewportPlaceholders';
import ChatHeader from './ChatHeader';
import CallBanner from './CallBanner';


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
    setActiveChannelId,
    scrollToMessageId,
    setScrollToMessageId,
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
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPins, setShowPins] = useState(false);
  const [isCallMaximized, setIsCallMaximized] = useState(false);
  const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);

  // ✅ useCurrentUser hook thay vì JSON.parse mỗi render
  const currentUser = useCurrentUser();

  // File Upload hook
  const {
    isDragging,
    uploadFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useChatFileUpload({
    activeChannelId,
    currentUser,
    onSendMessage,
  });

  // Scroll and unread optimization states
  const [showNewMessagesBadge, setShowNewMessagesBadge] = useState(false);
  const [firstUnreadMsgId, setFirstUnreadMsgId] = useState<string | null>(null);
  const isAtBottom = useRef(true);
  const prevMessagesLength = useRef(0);
  const prevChannelId = useRef<string | null>(null);
  const scrollRAF = useRef<number>(0);

  // Fetch workspaces (cached from queryClient)
  const { data: workspacesData } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });
  const workspaces = workspacesData || [];

  // Fetch channels list to find active channel name
  const { data: channelsData } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });
  const channels = channelsData || [];

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Fetch active DM channels
  const { data: dmChannelsData } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });
  const dmChannels = dmChannelsData || [];

  const activeDmChannel = dmChannels.find((d) => d.id === activeChannelId);
  const isVoiceOrDm = !!activeDmChannel || (!!activeChannel && activeChannel.type === 'voice');

  // ✅ Fetch workspace members ONCE — pass xuống MessageItem qua props
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Fetch pinned messages to show pin badge on messages
  const { data: pins = [] } = useQuery<any[]>({
    queryKey: ['pins', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];
      const res = await api.get(`/channels/${activeChannelId}/pins`);
      return res.data;
    },
    enabled: !!activeChannelId,
  });

  // Fetch active call participants for the current channel to show status banner
  const { data: callParticipantsData } = useQuery<any[]>({
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
    refetchInterval: 3000,
  });
  const callParticipants = callParticipantsData || [];

  // ✅ Infinite Query — fetch messages với cursor-based pagination
  const {
    data: messagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['messages', activeChannelId],
    queryFn: async ({ pageParam }) => {
      if (!activeChannelId) return [];
      const cursor = pageParam ? `&before=${pageParam}` : '';
      const res = await api.get(`/channels/${activeChannelId}/messages?limit=50${cursor}`);
      const msgs = res.data as ChatMessage[];
      return [...msgs].reverse();
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // Nếu page trả về < 50, không còn data cũ hơn
      if (!lastPage || lastPage.length < 50) return undefined;
      return lastPage[0]?.id; // cursor = oldest message ID in this page
    },
    enabled: !!activeChannelId,
  });

  // ✅ Flatten pages thành flat array, memoized
  const messages = useMemo(
    () => messagesData?.pages.flatMap((p) => p) ?? [],
    [messagesData]
  );

  // Intercept sending messages to handle reply prefixes
  const handleSendMessage = useCallback((channelId: string, content: string) => {
    onSendMessage(channelId, content);
  }, [onSendMessage]);

  const handleStartVoiceCall = useCallback(() => {
    if (!activeChannelId) return;
    useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
    handleSendMessage(activeChannelId, '[call:voice:active]');
  }, [activeChannelId, handleSendMessage]);

  const handleStartVideoCall = useCallback(() => {
    if (!activeChannelId) return;
    useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
    handleSendMessage(activeChannelId, '[call:video:active]');
  }, [activeChannelId, handleSendMessage]);

  // ✅ useMemo cho buildMessageTree — tránh tính lại mỗi render
  const structuredMessages = useMemo(
    () => buildMessageTree(messages),
    [messages]
  );

  const firstUnreadMsg = messages.find((m) => m.id === firstUnreadMsgId);
  const unreadTimestamp = firstUnreadMsg ? firstUnreadMsg.timestamp : null;

  const activeThreadMessage = activeThreadId 
    ? structuredMessages.find(m => m.id === activeThreadId)
    : null;

  // Send a threaded reply message
  const handleSendThreadReply = useCallback((content: string) => {
    if (!activeThreadMessage || !activeChannelId) return;
    const replyContent = `[reply:${activeThreadMessage.id}:${activeThreadMessage.username}] ${content}`;
    onSendMessage(activeChannelId, replyContent);
  }, [activeThreadMessage, activeChannelId, onSendMessage]);

  // ✅ Adaptive estimateSize — ước lượng chiều cao dựa trên content
  const getEstimatedSize = useCallback((index: number) => {
    const msg = structuredMessages[index];
    if (!msg) return 75;
    if (msg.content.startsWith('[image:')) return 280;
    if (msg.content.startsWith('[file:')) return 90;
    if (msg.content.startsWith('[call:')) return 100;
    if (msg.content.startsWith('[uploading:')) return 90;
    if (msg.content.length > 200) return 120;
    if (msg.replies && msg.replies.length > 0) return 110;
    return 75;
  }, [structuredMessages]);

  // Initialize TanStack React Virtual for virtualization
  const rowVirtualizer = useVirtualizer({
    count: structuredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: getEstimatedSize,
    overscan: 5,
  });

  // Scroll to bottom helper
  const scrollToBottom = useCallback(() => {
    if (parentRef.current && structuredMessages.length > 0) {
      rowVirtualizer.scrollToIndex(structuredMessages.length - 1, { align: 'end', behavior: 'smooth' });
    }
    setShowNewMessagesBadge(false);
    isAtBottom.current = true;
  }, [rowVirtualizer, structuredMessages.length]);

  // ✅ RAF-batched scroll handler — giảm state updates
  const handleScroll = useCallback(() => {
    cancelAnimationFrame(scrollRAF.current);
    scrollRAF.current = requestAnimationFrame(() => {
      const container = parentRef.current;
      if (!container) return;
      const threshold = 120;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
      isAtBottom.current = isNearBottom;
      if (isNearBottom) {
        setShowNewMessagesBadge(false);
      }
    });
  }, []);

  // ✅ Infinite scroll — load older messages khi scroll gần đầu
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const onScroll = () => {
      if (el.scrollTop < 200 && hasNextPage && !isFetchingNextPage) {
        const prevHeight = el.scrollHeight;
        fetchNextPage().then(() => {
          // Giữ vị trí scroll không nhảy khi prepend data cũ
          requestAnimationFrame(() => {
            if (parentRef.current) {
              parentRef.current.scrollTop = parentRef.current.scrollHeight - prevHeight;
            }
          });
        });
      }
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // On active channel change, autoscroll to bottom instantly, auto-focus input, and clear unread badge
  useEffect(() => {
    if (activeChannelId) {
      isAtBottom.current = true;
      setShowNewMessagesBadge(false);
      setFirstUnreadMsgId(null);
      setActiveThreadId(null);
      setIsCallMaximized(false);
      
      setTimeout(() => {
        const inputEl = document.querySelector('input[placeholder^="Gửi tin nhắn đến"]') as HTMLInputElement;
        if (inputEl) {
          inputEl.focus();
        }
      }, 50);

      // Only scroll to bottom if we're NOT targeting a specific message (from search/notifications)
      setTimeout(() => {
        if (parentRef.current && !useChatStore.getState().scrollToMessageId) {
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

  // Track height changes and auto scroll if was at bottom
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

  // Auto Scroll to Bottom on new messages
  useEffect(() => {
    if (activeChannelId !== prevChannelId.current) {
      prevChannelId.current = activeChannelId;
      prevMessagesLength.current = messages.length;
      return;
    }

    if (messages.length > prevMessagesLength.current) {
      const lastRawMessage = messages[messages.length - 1];
      const isReply = lastRawMessage && lastRawMessage.content.match(/^\[reply:/);

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
    
    prevMessagesLength.current = messages.length;
  }, [messages.length, activeChannelId, structuredMessages, currentUser]);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => cancelAnimationFrame(scrollRAF.current);
  }, []);

  // ✅ Scroll to specific message (from Search / Notifications) — two-step approach
  useEffect(() => {
    if (!scrollToMessageId || structuredMessages.length === 0) return;

    const targetIndex = structuredMessages.findIndex((m) => m.id === scrollToMessageId);
    if (targetIndex === -1) return;

    const msgId = scrollToMessageId;

    // Step 1: Tell virtualizer to jump to the approximate area (instant, not smooth)
    rowVirtualizer.scrollToIndex(targetIndex, { align: 'center', behavior: 'auto' });

    // Step 2: Retry until the DOM element is rendered, then precisely center it
    let attempts = 0;
    const tryScroll = () => {
      const container = parentRef.current;
      const el = container?.querySelector(`[data-msg-id="${msgId}"]`) as HTMLElement | null;

      if (el && container) {
        // Use getBoundingClientRect for accurate position in virtualized list
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const elCenterOffset = elRect.top - containerRect.top + elRect.height / 2;
        const containerCenter = container.clientHeight / 2;
        const scrollDelta = elCenterOffset - containerCenter;

        container.scrollTo({ top: container.scrollTop + scrollDelta, behavior: 'smooth' });

        setHighlightedMsgId(msgId);
        setScrollToMessageId(null);
        setTimeout(() => setHighlightedMsgId(null), 2500);
      } else if (attempts < 15) {
        attempts++;
        setTimeout(tryScroll, 80);
      }
    };

    // Delay slightly so panel close animation completes before we scroll
    const timer = setTimeout(tryScroll, 120);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollToMessageId, structuredMessages.length]);

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
              setActiveChannelId(firstText.id, 'channel', activeWorkspaceId);
            }
          }}
          apiParticipants={callParticipants}
        />
      </div>
    );
  }

  if (!activeChannelId) {
    return (
      <ChatViewportPlaceholders
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        channels={channels}
        activeVoiceChannelId={activeVoiceChannelId}
        setShowCreateWs={setShowCreateWs}
        setShowJoinWs={setShowJoinWs}
        setShowCreateChan={setShowCreateChan}
      />
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

  // onReplyClick handler — stable reference
  const handleReplyClick = (message: ChatMessage) => {
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
    setShowDetails(false);
  };

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
              <p className="text-zinc-550 text-xs mt-1">Tải lên trực tiếp thông qua SeaweedFS</p>
            </div>
          </div>
        )}

        {/* 2. Dynamic Island Persistent Voice widget */}
        {activeVoiceChannelId && !explorerOpen && activeVoiceChannelId !== activeChannelId && (
          <DynamicIslandCall />
        )}

        {/* Chat Header */}
        <ChatHeader
          activeDmChannel={activeDmChannel}
          chatTitle={chatTitle}
          handleStartVoiceCall={handleStartVoiceCall}
          handleStartVideoCall={handleStartVideoCall}
          showDetails={showDetails}
          setShowDetails={setShowDetails}
          setActiveThreadId={setActiveThreadId}
          toggleExplorer={toggleExplorer}
          explorerOpen={explorerOpen}
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          showPins={showPins}
          setShowPins={setShowPins}
          activeChannelId={activeChannelId}
          workspaceName={workspaces.find((w) => w.id === activeWorkspaceId)?.name}
        />

        {/* 3. Active call indicator banner */}
        <CallBanner
          callParticipants={callParticipants}
          activeVoiceChannelId={activeVoiceChannelId}
          activeChannelId={activeChannelId}
        />

        {/* 4. DM Active Call Room */}
        {activeDmChannel && activeVoiceChannelId === activeChannelId && (
          <DMCallRoomView
            channelName={chatTitle}
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
            isMaximized={isCallMaximized}
            onToggleMaximize={() => setIsCallMaximized(!isCallMaximized)}
          />
        )}

        {!isCallMaximized && (
          <>
            {/* Virtualized Message List */}
            <div 
              ref={parentRef}
              onScroll={handleScroll}
              className="flex-1 px-6 py-4 overflow-y-auto no-scrollbar"
              style={{ contain: 'strict' }}
            >
              {/* Loading indicator for older messages */}
              {isFetchingNextPage && (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <span className="ml-2 text-xs text-zinc-500">Đang tải tin nhắn cũ hơn...</span>
                </div>
              )}

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
                        willChange: 'transform',
                        contain: 'content',
                      }}
                      className="py-1 flex flex-col"
                      data-msg-id={msg.id}
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
                      {(() => {
                        const pin = pins.find((p: any) => p.message_id === msg.id);
                        return (
                          <MessageItem 
                            msg={msg} 
                            members={members}
                            onReplyClick={handleReplyClick}
                            unreadTimestamp={unreadTimestamp}
                            isActiveThread={activeThreadId === msg.id}
                            isHighlighted={highlightedMsgId === msg.id}
                            isPinned={!!pin}
                            pinId={pin?.id}
                          />
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
              
              {structuredMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-655 select-none">
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
          </>
        )}
      </div>

      {/* Dynamic Right Sidebar Panel (Thread, Details, Search, Notifications, Pins) */}
      {activeThreadMessage && !isCallMaximized ? (
        <ThreadSidebar
          parentMessage={activeThreadMessage}
          onClose={() => setActiveThreadId(null)}
          onSendReply={handleSendThreadReply}
          currentUser={currentUser}
          unreadTimestamp={unreadTimestamp}
          members={members}
        />
      ) : showDetails && !isCallMaximized ? (
        <DetailsSidebar
          onClose={() => setShowDetails(false)}
          messages={messages}
          onOpenPins={() => {
            setShowDetails(false);
            setShowPins(true);
          }}
        />
      ) : showSearch && !isCallMaximized ? (
        <SearchPanel
          onClose={() => setShowSearch(false)}
          onNavigateToChannel={(channelId) => {
            useChatStore.getState().setActiveChannelId(channelId, 'channel', activeWorkspaceId || undefined);
          }}
        />
      ) : showNotifications && !isCallMaximized ? (
        <NotificationPanel
          onClose={() => setShowNotifications(false)}
        />
      ) : showPins && !isCallMaximized ? (
        <PinnedMessagesPanel
          onClose={() => setShowPins(false)}
          channelName={chatTitle}
        />
      ) : null}
    </div>
  );
}
