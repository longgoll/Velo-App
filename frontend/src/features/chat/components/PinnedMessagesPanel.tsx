import { X, Pin, Trash2, ArrowRight, Loader2, Hash } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import { toast } from '@/store/useToastStore';
import api from '@/lib/api';

interface PinnedMessageItem {
  id: string;
  channel_id: string;
  message_id: string;
  pinned_by: string;
  content: string;
  username: string;
  created_at: string;
  pinner?: {
    id: string;
    username: string;
  };
}

interface PinnedMessagesPanelProps {
  onClose: () => void;
  channelName?: string;
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isMediaContent(content: string): boolean {
  return content.startsWith('[image:') || content.startsWith('[file:') || content.startsWith('[call:');
}

function getContentPreview(content: string): string {
  if (content.startsWith('[image:')) return '📷 Hình ảnh';
  if (content.startsWith('[file:')) return '📎 Tệp đính kèm';
  if (content.startsWith('[call:')) return '📞 Cuộc gọi';
  if (content.startsWith('[reply:')) {
    const match = content.match(/^\[reply:[^:]+:[^\]]+\]\s*(.*)/s);
    return match?.[1]?.trim() || content;
  }
  return content;
}

export default function PinnedMessagesPanel({ onClose, channelName }: PinnedMessagesPanelProps) {
  const { activeChannelId, activeWorkspaceId, setScrollToMessageId } = useChatStore();
  const queryClient = useQueryClient();

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Fetch pins
  const { data: pins = [], isLoading } = useQuery<PinnedMessageItem[]>({
    queryKey: ['pins', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];
      const res = await api.get(`/channels/${activeChannelId}/pins`);
      return res.data;
    },
    enabled: !!activeChannelId,
  });

  // Fetch workspace members to check role
  const { data: members = [] } = useQuery<any[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const myRole = members.find((m) => m.user_id === currentUser?.id)?.role || 'member';
  const isAdminOrOwner = myRole === 'owner' || myRole === 'admin';

  // Unpin mutation
  const unpinMutation = useMutation({
    mutationFn: (pinId: string) =>
      api.delete(`/channels/${activeChannelId}/pins/${pinId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pins', activeChannelId] });
      toast.success('Đã bỏ ghim tin nhắn.');
    },
    onError: () => {
      toast.error('Không thể bỏ ghim tin nhắn.');
    },
  });

  const handleUnpin = (pinId: string) => {
    unpinMutation.mutate(pinId);
  };

  return (
    <div className="w-[380px] border-l border-zinc-200 dark:border-zinc-950 bg-zinc-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-250 relative">
      {/* Header */}
      <div className="px-4 h-[52px] border-b border-zinc-950 flex items-center gap-2 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <Pin className="w-4 h-4 text-amber-400 shrink-0" />
        <span className="font-bold text-white text-sm">Tin nhắn đã ghim</span>
        {channelName && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-550 ml-1">
            <Hash className="w-2.5 h-2.5" />
            <span>{channelName}</span>
          </div>
        )}
        <span className="ml-auto text-[10px] text-zinc-550 font-semibold bg-zinc-850 border border-zinc-800 px-2 py-0.5 rounded-full">
          {pins.length} ghim
        </span>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer ml-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            </div>
          )}

          {!isLoading && pins.length === 0 && (
            <div className="flex flex-col items-center justify-center py-14 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                <Pin className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Chưa có tin nhắn ghim</p>
              <p className="text-xs text-zinc-550 mt-1 max-w-[220px]">
                Hover vào một tin nhắn rồi nhấn biểu tượng ghim để lưu tin nhắn quan trọng
              </p>
            </div>
          )}

          {!isLoading && pins.length > 0 && (
            <>
              <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-widest">
                {pins.length} tin nhắn được ghim
              </p>
              {pins.map((pin) => (
                <div
                  key={pin.id}
                  onClick={() => setScrollToMessageId(pin.message_id)}
                  className="group flex flex-col gap-2.5 p-3 bg-zinc-950/30 border border-zinc-850 rounded-xl hover:bg-zinc-850/60 hover:border-zinc-750 transition cursor-pointer active:scale-[0.98]"
                >
                  {/* Top: pinner info + actions */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-[9px] text-zinc-550 font-semibold">
                      <Pin className="w-2.5 h-2.5 text-amber-400" />
                      <span>
                        Ghim bởi{' '}
                        <span className="text-zinc-400">
                          {pin.pinner?.username || 'Người dùng'}
                        </span>
                      </span>
                      <span className="text-zinc-650">·</span>
                      <span className="font-mono text-zinc-650">{formatTimestamp(pin.created_at)}</span>
                    </div>
                    {(isAdminOrOwner || pin.pinned_by === currentUser?.id) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnpin(pin.id);
                        }}
                        disabled={unpinMutation.isPending}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-rose-500/15 text-zinc-550 hover:text-rose-400 transition border-0 outline-none cursor-pointer disabled:opacity-50"
                        title="Bỏ ghim"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex items-start gap-2.5">
                    <Avatar className="w-7 h-7 shrink-0 mt-0.5">
                      <AvatarFallback
                        className={`text-[10px] font-bold text-white ${getAvatarGradient(pin.username)}`}
                      >
                        {pin.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[11px] font-bold text-zinc-300">
                          {pin.username}
                        </span>
                      </div>
                      <p
                        className={`text-xs leading-relaxed break-words line-clamp-4 ${
                          isMediaContent(pin.content) ? 'text-indigo-400 italic' : 'text-zinc-400'
                        }`}
                      >
                        {getContentPreview(pin.content)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-650 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
