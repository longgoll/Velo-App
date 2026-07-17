import { useState, useEffect, useRef } from 'react';
import { CornerUpLeft, Smile, Copy, Check } from 'lucide-react';
import api from '@/lib/api';
import type { ChatMessage } from '@/types';

interface MessageQuickActionsProps {
  msg: ChatMessage;
  onReplyClick: (msg: ChatMessage) => void;
  hideReply?: boolean;
}

export function MessageQuickActions({
  msg,
  onReplyClick,
  hideReply = false,
}: MessageQuickActionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleCopyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
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
