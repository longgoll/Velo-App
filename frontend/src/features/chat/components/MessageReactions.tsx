import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { ChatMessage, ReactionSummary } from '@/types';

interface MessageReactionsProps {
  msg: ChatMessage;
}

export function MessageReactions({ msg }: MessageReactionsProps) {
  const queryClient = useQueryClient();
  const currentUser = useCurrentUser();

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

    // ✅ Optimistic update — instant feedback
    queryClient.setQueryData(['messages', msg.channel_id], (oldData: any) => {
      const updateMsg = (m: ChatMessage) => {
        if (m.id !== msg.id) return m;
        const reactions = [...(m.reactions || [])];
        const idx = reactions.findIndex((r) => r.emoji === emoji);

        if (hasMe) {
          // Remove reaction
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
          // Add reaction
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
      // Support InfiniteQuery pages structure
      if (oldData.pages) {
        return {
          ...oldData,
          pages: oldData.pages.map((page: ChatMessage[]) => page.map(updateMsg)),
        };
      }
      // Legacy array
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
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['messages', msg.channel_id] });
    }
  };

  if (!msg.reactions || msg.reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-100 select-none">
      {msg.reactions.map((reaction) => {
        const count = reaction.usernames.length;
        if (count === 0) return null;

        const hasMe = reaction.me;
        const hoverText = reaction.usernames.join(', ') + ' đã phản hồi';

        return (
          <button
            key={reaction.emoji}
            onClick={() => handleToggleReaction(reaction.emoji)}
            title={hoverText}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 active:scale-95 shadow-sm group/react-pill ${
              hasMe
                ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/35 hover:bg-indigo-500/25'
                : 'bg-zinc-950/40 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
            }`}
          >
            <span className="text-sm scale-100 group-hover/react-pill:scale-110 transition duration-150">{reaction.emoji}</span>
            <span className="text-[10px] font-bold">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
export default MessageReactions;
