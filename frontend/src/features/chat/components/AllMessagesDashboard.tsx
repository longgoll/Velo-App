import { useState } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import type { Channel, DMChannel, Workspace, ChatMessage } from '@/types';
import { 
  MessageSquare, Hash, Users, Bell, Sparkles, CheckCircle2, 
  ArrowRight, Send, Inbox, AtSign, Volume2 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

interface AllMessagesDashboardProps {
  onSendMessage: (channelId: string, content: string) => void;
}

export default function AllMessagesDashboard({ onSendMessage }: AllMessagesDashboardProps) {
  const queryClient = useQueryClient();
  const { 
    unreadChannels, 
    recentConversations, 
    clearUnread,
    setActiveWorkspaceId,
    setActiveChannelId,
    setActiveFilter
  } = useChatStore();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'mentions'>('unread');
  const [quickReplies, setQuickReplies] = useState<Record<string, string>>({});

  // 1. Fetch workspaces
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  // 2. Fetch channels for all workspaces
  const channelsQueries = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ['channels', ws.id],
      queryFn: async () => {
        const res = await api.get(`/workspaces/${ws.id}/channels`);
        return res.data as Channel[];
      },
      enabled: workspaces.length > 0,
    })),
  });

  // 3. Fetch DMs for all workspaces
  const dmsQueries = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ['dms', ws.id],
      queryFn: async () => {
        const res = await api.get(`/workspaces/${ws.id}/dms`);
        return res.data as DMChannel[];
      },
      enabled: workspaces.length > 0,
    })),
  });

  // Flatten all channels and DMs
  const allChannels = channelsQueries.flatMap((q) => q.data || []);
  const allDms = dmsQueries.flatMap((q) => q.data || []);

  // Map workspace ID to workspace name
  const workspaceMap = workspaces.reduce((acc, ws) => {
    acc[ws.id] = ws.name;
    return acc;
  }, {} as Record<string, string>);

  // Find info of a channel/DM by ID
  const getChannelInfo = (id: string) => {
    const channel = allChannels.find((c) => c.id === id);
    if (channel) {
      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        workspaceId: channel.workspace_id,
        workspaceName: workspaceMap[channel.workspace_id] || 'Workspace',
        isDm: false,
      };
    }
    const dm = allDms.find((d) => d.id === id);
    if (dm) {
      const currentUserStr = localStorage.getItem('user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const otherUser = dm.user_one_id === currentUser?.id ? dm.user_two : dm.user_one;
      return {
        id: dm.id,
        name: otherUser?.username || 'Trò chuyện',
        type: 'text' as const,
        workspaceId: dm.workspace_id,
        workspaceName: workspaceMap[dm.workspace_id] || 'Workspace',
        isDm: true,
      };
    }
  };

  // Fetch actual database mentions/notifications
  const { data: dbNotifications = [], refetch: refetchNotifications } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data;
    },
    refetchInterval: 5000,
  });

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      refetchNotifications();
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      refetchNotifications();
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  // 4. Gather active channel IDs (unread + recent)
  const unreadChannelIds = Object.keys(unreadChannels).filter((id) => unreadChannels[id] > 0);
  const recentChannelIds = recentConversations.map((c) => c.id);
  const activeIds = Array.from(new Set([...unreadChannelIds, ...recentChannelIds]));

  // 5. Fetch messages for active channels
  const messagesQueries = useQueries({
    queries: activeIds.map((channelId) => ({
      queryKey: ['messages', channelId],
      queryFn: async () => {
        const res = await api.get(`/channels/${channelId}/messages?limit=20`);
        const msgs = res.data as ChatMessage[];
        return [...msgs].reverse(); // Sort oldest to newest (chronological) for the list
      },
      enabled: activeIds.length > 0,
      staleTime: 5000,
    })),
  });

  // Map channel ID to messages
  const messagesMap = activeIds.reduce((acc, id, idx) => {
    acc[id] = messagesQueries[idx]?.data || [];
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  // Navigate helper
  const navigateToConversation = (id: string, isDm: boolean, workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveFilter(isDm ? 'dms' : 'workspaces');
    setActiveChannelId(id, isDm ? 'dm' : 'channel', workspaceId);
  };

  // Quick reply handler
  const handleQuickReplySubmit = (channelId: string) => {
    const text = quickReplies[channelId]?.trim();
    if (!text) return;

    onSendMessage(channelId, text);
    
    // Add locally to cache immediately for better responsive feel
    const currentUserStr = localStorage.getItem('user');
    const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
    const tempMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      channel_id: channelId,
      user_id: currentUser?.id || 'me',
      username: currentUser?.username || 'Me',
      content: text,
      timestamp: Date.now(),
    };

    queryClient.setQueryData(['messages', channelId], (old: ChatMessage[] | undefined) => {
      return [...(old || []), tempMsg];
    });

    // Clear unread & local input
    clearUnread(channelId);
    setQuickReplies((prev) => ({ ...prev, [channelId]: '' }));
  };

  // Filters unreads list
  const unreadList = unreadChannelIds
    .map((id) => {
      const info = getChannelInfo(id);
      const messages = messagesMap[id] || [];
      const unreadCount = unreadChannels[id] || 0;
      // Get the slice of unread messages from the end of history
      const unreadMsgs = messages.slice(-unreadCount);
      return { info, messages: unreadMsgs, unreadCount };
    })
    .filter((item) => item.info !== null);

  // Filters recent list
  const recentList = recentConversations
    .map((c) => {
      const info = getChannelInfo(c.id);
      const messages = messagesMap[c.id] || [];
      const lastMessage = messages[messages.length - 1] || null;
      return { info, lastMessage, timestamp: c.timestamp };
    })
    .filter((item) => item.info !== null);

  // Convert DB notifications to mentionsList format
  const mentionsList = dbNotifications
    .map((notif) => {
      const info = getChannelInfo(notif.channel_id);
      return {
        id: notif.id,
        isRead: notif.is_read,
        info,
        message: {
          id: notif.message_id,
          channel_id: notif.channel_id,
          user_id: notif.sender_id,
          username: notif.sender?.username || 'Người dùng',
          content: notif.content,
          timestamp: new Date(notif.created_at).getTime(),
        },
      };
    })
    .filter((item) => item.info !== null);

  return (
    <div className="flex-1 bg-zinc-950 flex flex-col h-full select-none relative overflow-hidden">
      {/* Background glow ambient effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-purple-500/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <div className="px-8 h-[56px] border-b border-zinc-900/60 flex items-center justify-between bg-zinc-950/40 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-2">
          <Inbox className="w-5 h-5 text-indigo-400" />
          <h2 className="font-bold text-white text-sm tracking-tight">Tất cả hoạt động</h2>
        </div>

        {/* Custom Tab Selector */}
        <div className="flex bg-zinc-900/80 p-0.5 rounded-lg border border-zinc-800/40 text-xs">
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer outline-none border-0 ${
              activeTab === 'unread'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Chưa đọc
            {unreadChannelIds.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer outline-none border-0 ${
              activeTab === 'all'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Gần đây
          </button>
          <button
            onClick={() => setActiveTab('mentions')}
            className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1.5 cursor-pointer outline-none border-0 ${
              activeTab === 'mentions'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <AtSign className="w-3.5 h-3.5" />
            Nhắc đến tôi
            {mentionsList.length > 0 && (
              <span className="flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[8px] font-bold text-white bg-indigo-500 rounded-full">
                {mentionsList.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content scroll area */}
      <ScrollArea className="flex-1 px-8 py-6 z-10">
        {/* ================== UNREAD MESSAGES TAB ================== */}
        {activeTab === 'unread' && (
          <div className="space-y-4 max-w-4xl mx-auto">
            {unreadList.length > 0 ? (
              unreadList.map(({ info, messages, unreadCount }) => {
                if (!info) return null;
                const Icon = info.isDm ? Users : (info.type === 'voice' ? Volume2 : Hash);

                return (
                  <div 
                    key={info.id}
                    className="bg-zinc-900/30 backdrop-blur-md rounded-2xl border border-zinc-800/80 overflow-hidden shadow-md flex flex-col group hover:border-zinc-800 transition-colors"
                  >
                    {/* Header of Channel Card */}
                    <div className="px-5 py-3.5 bg-zinc-900/40 border-b border-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 rounded bg-zinc-850 text-indigo-400">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-100 text-xs truncate">
                              {info.name}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-900/30">
                              {info.workspaceName}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {unreadCount} chưa đọc
                        </span>
                        
                        <button 
                          onClick={() => clearUnread(info.id)}
                          className="text-[10px] text-zinc-500 hover:text-zinc-300 font-medium bg-transparent border-0 cursor-pointer transition outline-none"
                        >
                          Đánh dấu đã đọc
                        </button>
                        
                        <button 
                          onClick={() => navigateToConversation(info.id, info.isDm, info.workspaceId)}
                          className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition outline-none border-0 cursor-pointer"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Messages feed */}
                    <div className="p-4 space-y-3 flex-1">
                      {messages.map((msg) => (
                        <div key={msg.id} className="flex gap-3 text-xs">
                          <Avatar size="sm">
                            <AvatarFallback className={`text-[9px] font-bold ${getAvatarGradient(msg.username)}`}>
                              {msg.username.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-semibold text-zinc-200">{msg.username}</span>
                              <span className="text-[9px] text-zinc-500">
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-zinc-350 mt-0.5 select-text break-words whitespace-pre-wrap leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Reply Form */}
                    <div className="px-4 py-3 bg-zinc-950/60 border-t border-zinc-900 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={`Trả lời nhanh tại #${info.name}...`}
                        value={quickReplies[info.id] || ''}
                        onChange={(e) => setQuickReplies(prev => ({ ...prev, [info.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleQuickReplySubmit(info.id);
                          }
                        }}
                        className="flex-1 bg-zinc-900 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/60 transition"
                      />
                      <button
                        onClick={() => handleQuickReplySubmit(info.id)}
                        disabled={!quickReplies[info.id]?.trim()}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl transition cursor-pointer border-0 outline-none"
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Catch-up illustration */
              <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500/10 to-emerald-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 shadow-md shadow-emerald-500/5">
                  <CheckCircle2 className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-zinc-100">Tuyệt vời, tất cả đã được đọc!</h3>
                <p className="text-xs text-zinc-500 mt-2 max-w-sm leading-relaxed">
                  Không có tin nhắn chưa đọc nào gần đây. Bạn đã bắt kịp mọi thứ trong các không gian làm việc.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ================== RECENT ACTIVITY TAB ================== */}
        {activeTab === 'all' && (
          <div className="space-y-2 max-w-3xl mx-auto">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-3">Các cuộc hội thoại gần đây</h3>
            
            {recentList.length > 0 ? (
              <div className="bg-zinc-900/10 rounded-2xl border border-zinc-900 overflow-hidden divide-y divide-zinc-900/60 shadow-sm">
                {recentList.map(({ info, lastMessage, timestamp }) => {
                  if (!info) return null;
                  const Icon = info.isDm ? Users : (info.type === 'voice' ? Volume2 : Hash);

                  return (
                    <div 
                      key={info.id}
                      onClick={() => navigateToConversation(info.id, info.isDm, info.workspaceId)}
                      className="p-4 flex items-center justify-between hover:bg-zinc-900/30 cursor-pointer transition group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2 rounded-xl bg-zinc-900 group-hover:bg-zinc-850 text-zinc-400 group-hover:text-indigo-400 transition-colors">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200 text-xs truncate group-hover:text-white">
                              {info.name}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-zinc-900 text-zinc-500">
                              {info.workspaceName}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline gap-1.5 text-zinc-500 text-[11px] truncate">
                            {lastMessage ? (
                              <>
                                <span className="font-medium text-zinc-400">{lastMessage.username}:</span>
                                <span className="truncate max-w-[400px] font-normal">{lastMessage.content}</span>
                              </>
                            ) : (
                              <span className="italic text-[10px] text-zinc-650">Chưa có tin nhắn nào</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-[10px] text-zinc-500 font-mono group-hover:text-zinc-300 flex items-center gap-2">
                        <span>
                          {new Date(timestamp).toLocaleDateString([], { month: 'numeric', day: 'numeric' })}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition duration-200 text-indigo-400 transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
                <Sparkles className="w-8 h-8 text-zinc-800 mb-2" />
                <p className="text-xs">Không có lịch sử trò chuyện gần đây nào được ghi lại.</p>
              </div>
            )}
          </div>
        )}

        {/* ================== MENTIONS TAB ================== */}
        {activeTab === 'mentions' && (
          <div className="space-y-3 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Được đề cập gần đây</h3>
              {mentionsList.some(item => !item.isRead) && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="px-2.5 py-1 text-[9px] font-bold text-zinc-400 hover:text-indigo-400 hover:bg-indigo-950/20 border border-zinc-850 hover:border-indigo-500/30 rounded-lg transition cursor-pointer outline-none"
                >
                  Đánh dấu tất cả đã đọc
                </button>
              )}
            </div>
            
            {mentionsList.length > 0 ? (
              mentionsList.map((item) => {
                const { info, message, isRead } = item;
                if (!info) return null;
                const Icon = info.isDm ? Users : (info.type === 'voice' ? Volume2 : Hash);
                const isUnread = !isRead;

                return (
                  <div 
                    key={item.id}
                    onClick={() => navigateToConversation(info.id, info.isDm, info.workspaceId)}
                    className={`p-4 hover:bg-zinc-900/30 border rounded-2xl cursor-pointer transition group flex items-start gap-4 ${
                      isUnread ? 'border-indigo-500/25 bg-indigo-950/5' : 'border-zinc-900/80 bg-zinc-900/10'
                    }`}
                  >
                    <Avatar size="sm">
                      <AvatarFallback className={`text-[10px] font-bold ${getAvatarGradient(message.username)}`}>
                        {message.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-zinc-200 text-xs">{message.username}</span>
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          )}
                          <span className="text-[9px] text-zinc-550">
                            {new Date(message.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(item.id);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 hover:text-emerald-400 flex items-center gap-1 bg-zinc-950 border border-zinc-850 rounded hover:border-emerald-500/40 transition duration-150 cursor-pointer outline-none shrink-0"
                              title="Đánh dấu đã đọc"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Đã đọc</span>
                            </button>
                          )}
                          <div className="flex items-center gap-1.5 text-zinc-500 group-hover:text-indigo-400 transition-colors">
                            <Icon className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-medium">{info.name} ({info.workspaceName})</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-zinc-300 text-xs mt-1.5 select-text break-words whitespace-pre-wrap leading-relaxed border-l-2 border-indigo-500/40 pl-3">
                        {message.content}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
                <AtSign className="w-8 h-8 text-zinc-800 mb-2" />
                <p className="text-xs">Không có tin nhắn nào nhắc đến bạn gần đây.</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
