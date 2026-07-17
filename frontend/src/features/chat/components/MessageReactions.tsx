import api from '@/lib/api';
import type { ChatMessage } from '@/types';

interface MessageReactionsProps {
  msg: ChatMessage;
}

export function MessageReactions({ msg }: MessageReactionsProps) {
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

    try {
      if (hasMe) {
        await api.delete(url, { data: payload });
      } else {
        await api.post(url, payload);
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
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
