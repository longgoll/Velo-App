import { useState, useEffect, useRef } from 'react';
import { CornerUpLeft, Smile, Copy, Check, Pin } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import api from '@/lib/api';
import { useChatStore } from '@/store/useChatStore';
import { toast } from '@/store/useToastStore';
import type { ChatMessage, ReactionSummary, WorkspaceMember } from '@/types';

interface MessageQuickActionsProps {
  msg: ChatMessage;
  onReplyClick: (msg: ChatMessage) => void;
  hideReply?: boolean;
  channelId?: string;
  onPinSuccess?: () => void;
  isPinned?: boolean;
  pinId?: string;
  members?: WorkspaceMember[];
}

export function MessageQuickActions({
  msg,
  onReplyClick,
  hideReply = false,
  channelId,
  onPinSuccess,
  isPinned = false,
  pinId,
  members = [],
}: MessageQuickActionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();
  const { activeWorkspaceId } = useChatStore();

  // Check if user is admin/owner to show pin button
  const workspaceMembers = members.length > 0 
    ? members 
    : (queryClient.getQueryData<any[]>(['workspace-members', activeWorkspaceId]) || []);
  const myRole = (workspaceMembers as any[]).find((m: any) => m.user_id === currentUser?.id)?.role || 'member';
  const canPin = myRole === 'owner' || myRole === 'admin';

  useEffect(() => {
    if (!showPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showPicker]);

  // ✅ Optimistic reaction toggle
  const handleToggleReaction = async (emoji: string) => {
    const reaction = msg.reactions?.find((r) => r.emoji === emoji);
    const hasMe = reaction?.me;

    const url = `/channels/${msg.channel_id}/messages/${msg.id}/reactions`;
    const payload = {
      emoji,
      content: msg.content,
      username: msg.username,
      user_id: msg.user_id,
      timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp,
    };

    // Optimistic update
    queryClient.setQueryData(['messages', msg.channel_id], (oldData: any) => {
      const updateMsg = (m: ChatMessage) => {
        if (m.id !== msg.id) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);

        if (hasMe) {
          if (idx !== -1) {
            const updated: ReactionSummary = {
              ...reactions[idx],
              usernames: reactions[idx].usernames.filter((u) => u !== currentUser?.username),
              me: false,
            };
            if (updated.usernames.length === 0) {
              reactions.splice(idx, 1);
            } else {
              reactions[idx] = updated;
            }
          }
        } else {
          if (idx !== -1) {
            reactions[idx] = {
              ...reactions[idx],
              usernames: [...reactions[idx].usernames, currentUser?.username || ''],
              me: true,
            };
          } else {
            reactions.push({
              emoji,
              usernames: [currentUser?.username || ''],
              me: true,
            });
          }
        }
        return { ...m, reactions };
      };

      if (!oldData) return oldData;
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: ChatMessage[]) => page.map(updateMsg)),
        };
      }
      return (oldData as ChatMessage[]).map(updateMsg);
    });

    try {
      if (hasMe) {
        await api.delete(url, { data: payload });
      } else {
        await api.post(url, payload);
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      queryClient.invalidateQueries({ queryKey: ['messages', msg.channel_id] });
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handlePin = async () => {
    const cId = channelId || msg.channel_id;
    if (!cId) return;
    setIsPinning(true);
    try {
      await api.post(`/channels/${cId}/pins`, {
        message_id: msg.id,
        content: msg.content,
        username: msg.username,
      });
      queryClient.invalidateQueries({ queryKey: ['pins', cId] });
      toast.success('Đã ghim tin nhắn!');
      onPinSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể ghim tin nhắn.');
    } finally {
      setIsPinning(false);
    }
  };

  const handleUnpin = async () => {
    const cId = channelId || msg.channel_id;
    if (!cId || !pinId) return;
    setIsPinning(true);
    try {
      await api.delete(`/channels/${cId}/pins/${pinId}`);
      queryClient.invalidateQueries({ queryKey: ['pins', cId] });
      toast.success('Đã bỏ ghim tin nhắn!');
      onPinSuccess?.();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Không thể bỏ ghim tin nhắn.');
    } finally {
      setIsPinning(false);
    }
  };

  return (
    <div className="relative">
      {/* Floating Quick Action Bar on Hover */}
      {!hideReply && (
        <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition absolute right-3 -top-3 flex items-center bg-zinc-950 border border-zinc-800 shadow-xl rounded-xl p-1 z-20 duration-150 animate-in fade-in slide-in-from-bottom-1 gap-0.5">
          {/* Quick Reactions */}
          {['👍', '👀', '✅'].map((emoji) => {
            const reaction = msg.reactions?.find((r) => r.emoji === emoji);
            const hasMe = reaction?.me;
            return (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition active:scale-90 cursor-pointer border-0 outline-none ${
                  hasMe ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-400'
                }`}
                title={emoji === '👍' ? 'Like' : emoji === '👀' ? 'Looking' : 'Completed'}
              >
                <span className="text-sm">{emoji}</span>
              </button>
            );
          })}

          {/* Separator */}
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

          {/* Add reaction trigger */}
          <button
            ref={triggerRef}
            onClick={() => setShowPicker(!showPicker)}
            className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none emoji-picker-trigger ${
              showPicker ? 'bg-zinc-800 text-white' : ''
            }`}
            title="Thêm phản hồi"
          >
            <Smile className="w-4 h-4" />
          </button>

          {/* Reply trigger */}
          <button
            onClick={() => onReplyClick(msg)}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none"
            title="Trả lời luồng"
          >
            <CornerUpLeft className="w-4 h-4" />
          </button>

          {/* Copy message text */}
          <button
            onClick={handleCopyText}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none"
            title="Sao chép văn bản"
          >
            {copiedText ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
          </button>

          {/* Pin message (admin/owner only) */}
          {canPin && (
            <button
              onClick={isPinned ? handleUnpin : handlePin}
              disabled={isPinning}
              className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition active:scale-90 cursor-pointer border-0 outline-none disabled:opacity-50 ${
                isPinned ? 'text-amber-400 hover:text-zinc-400' : 'text-zinc-400 hover:text-amber-400'
              }`}
              title={isPinned ? 'Bỏ ghim tin nhắn' : 'Ghim tin nhắn'}
            >
              <Pin className={`w-4 h-4 ${isPinned ? 'fill-amber-400/20' : ''}`} />
            </button>
          )}
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showPicker && (
        <div
          ref={containerRef}
          className="absolute right-3 top-6 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl p-2.5 z-30 flex gap-1.5 flex-wrap max-w-[220px] emoji-picker-container animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {['😀', '😂', '🔥', '👍', '❤️', '🎉', '🚀', '👀', '💯', '✨', '💻', '🙌', '✅'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                handleToggleReaction(emoji);
                setShowPicker(false);
              }}
              className="text-base p-1.5 hover:bg-zinc-800 rounded-lg transition active:scale-90 cursor-pointer outline-none border-0"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export default MessageQuickActions;
