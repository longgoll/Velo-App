import { useState } from 'react';
import { Bell, X, Check, CheckCheck, AtSign, MessageSquare, Hash, ArrowRight, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import api from '@/lib/api';

interface NotificationItem {
  id: string;
  user_id: string;
  sender_id: string;
  channel_id: string;
  message_id: string;
  content: string;
  type: 'mention' | 'dm';
  is_read: boolean;
  created_at: string;
  sender?: {
    id: string;
    username: string;
    email: string;
  };
  channel?: {
    id: string;
    name: string;
    type: string;
  };
}

interface NotificationPanelProps {
  onClose: () => void;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

function groupNotificationsByDate(notifications: NotificationItem[]) {
  const groups: { label: string; items: NotificationItem[] }[] = [];
  const today: NotificationItem[] = [];
  const yesterday: NotificationItem[] = [];
  const older: NotificationItem[] = [];

  const now = new Date();
  for (const n of notifications) {
    const d = new Date(n.created_at);
    const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diff === 0) today.push(n);
    else if (diff === 1) yesterday.push(n);
    else older.push(n);
  }

  if (today.length > 0) groups.push({ label: 'Hôm nay', items: today });
  if (yesterday.length > 0) groups.push({ label: 'Hôm qua', items: yesterday });
  if (older.length > 0) groups.push({ label: 'Trước đó', items: older });
  return groups;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const queryClient = useQueryClient();
  const { setActiveChannelId, activeWorkspaceId, setScrollToMessageId } = useChatStore();

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications?limit=50');
      return res.data;
    },
    refetchInterval: 30000,
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const unreadCount = unreadData?.unread_count ?? 0;

  // Mark single as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const handleClickNotification = (n: NotificationItem) => {
    if (!n.is_read) {
      markAsReadMutation.mutate(n.id);
    }

    const targetChannelId = n.channel_id;
    const targetMsgId = n.message_id;

    // Close panel first so layout settles
    onClose();

    // Navigate + set scroll target in next tick
    setTimeout(() => {
      setScrollToMessageId(targetMsgId);
      setActiveChannelId(targetChannelId, 'channel', activeWorkspaceId || undefined);
    }, 0);
  };

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications;
  const groups = groupNotificationsByDate(filtered);

  return (
    <div className="w-[380px] border-l border-zinc-200 dark:border-zinc-950 bg-zinc-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-250 relative">
      {/* Header */}
      <div className="px-4 h-[52px] border-b border-zinc-950 flex items-center gap-2 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <Bell className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="font-bold text-white text-sm">Thông báo</span>
        {unreadCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:text-white bg-zinc-800/60 hover:bg-zinc-750 rounded-lg transition border-0 outline-none cursor-pointer disabled:opacity-50"
              title="Đánh dấu tất cả đã đọc"
            >
              <CheckCheck className="w-3 h-3" />
              <span>Đọc hết</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-4 py-2.5 border-b border-zinc-950/80 shrink-0">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition border-0 outline-none cursor-pointer ${
              filter === f
                ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            {f === 'all' ? 'Tất cả' : `Chưa đọc${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-3 space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </p>
              <p className="text-xs text-zinc-550 mt-1">
                {filter === 'unread'
                  ? 'Bạn đã đọc tất cả thông báo!'
                  : 'Thông báo về @mention và tin nhắn sẽ xuất hiện ở đây'}
              </p>
            </div>
          )}

          {groups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <div className="text-[9px] font-bold text-zinc-550 uppercase tracking-widest px-1 mb-2">
                {group.label}
              </div>

              {group.items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left cursor-pointer outline-none group ${
                    !n.is_read
                      ? 'bg-indigo-950/30 border-indigo-500/20 hover:bg-indigo-950/50 hover:border-indigo-500/40'
                      : 'bg-zinc-950/20 border-zinc-850 hover:bg-zinc-850 hover:border-zinc-750'
                  }`}
                >
                  {/* Sender Avatar */}
                  <div className="relative shrink-0">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback
                        className={`text-[11px] font-bold text-white ${getAvatarGradient(n.sender?.username || 'U')}`}
                      >
                        {(n.sender?.username || 'U').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {/* Type badge */}
                    <div
                      className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-zinc-900 flex items-center justify-center ${
                        n.type === 'mention' ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                    >
                      {n.type === 'mention' ? (
                        <AtSign className="w-2 h-2 text-white" />
                      ) : (
                        <MessageSquare className="w-2 h-2 text-white" />
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-[11px] font-bold truncate ${
                          !n.is_read ? 'text-white' : 'text-zinc-300'
                        }`}
                      >
                        {n.sender?.username || 'Người dùng'}
                      </span>
                      <span className="text-[9px] text-zinc-650 shrink-0 font-mono">
                        {formatTimestamp(n.created_at)}
                      </span>
                    </div>

                    {n.channel && (
                      <div className="flex items-center gap-1 text-[9px] text-zinc-550 mb-1">
                        <Hash className="w-2.5 h-2.5" />
                        <span>{n.channel.name}</span>
                      </div>
                    )}

                    <p
                      className={`text-xs leading-relaxed line-clamp-2 ${
                        !n.is_read ? 'text-zinc-200' : 'text-zinc-450'
                      }`}
                    >
                      {n.content}
                    </p>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1" />
                    )}
                    <ArrowRight
                      className={`w-3.5 h-3.5 transition ${
                        !n.is_read
                          ? 'text-indigo-400 group-hover:text-indigo-300'
                          : 'text-zinc-650 group-hover:text-zinc-400'
                      }`}
                    />
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReadMutation.mutate(n.id);
                        }}
                        className="p-1 rounded-md hover:bg-zinc-700 text-zinc-550 hover:text-white transition border-0 outline-none cursor-pointer"
                        title="Đánh dấu đã đọc"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
