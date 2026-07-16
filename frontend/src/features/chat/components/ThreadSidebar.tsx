import { useRef, useEffect, useState } from 'react';
import { X, MessageSquare, Send, ArrowDown } from 'lucide-react';
import type { ChatMessage } from '@/types';
import MessageItem from './MessageItem';

interface ThreadSidebarProps {
  parentMessage: ChatMessage & { replies?: ChatMessage[] };
  onClose: () => void;
  onSendReply: (content: string) => void;
  currentUser: any;
  unreadTimestamp?: string | number | null;
}

export default function ThreadSidebar({
  parentMessage,
  onClose,
  onSendReply,
  currentUser,
  unreadTimestamp
}: ThreadSidebarProps) {
  const [content, setContent] = useState('');
  const [showNewRepliesBadge, setShowNewRepliesBadge] = useState(false);
  const repliesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  // Auto scroll replies
  const repliesCount = parentMessage.replies?.length || 0;
  useEffect(() => {
    const container = repliesRef.current;
    if (!container) return;

    if (isInitialLoad.current) {
      // Scroll to bottom instantly on first load
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 50);
      isInitialLoad.current = false;
      return;
    }

    const threshold = 100;
    const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;

    if (isAtBottom) {
      container.scrollTop = container.scrollHeight;
      setShowNewRepliesBadge(false);
    } else {
      // Show badge if last reply is from someone else
      const lastReply = parentMessage.replies?.[parentMessage.replies.length - 1];
      if (lastReply && lastReply.user_id !== currentUser?.id) {
        setShowNewRepliesBadge(true);
      }
    }
  }, [repliesCount, parentMessage.replies, currentUser?.id]);

  const handleScroll = () => {
    const container = repliesRef.current;
    if (!container) return;
    const threshold = 100;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= threshold;
    if (isNearBottom) {
      setShowNewRepliesBadge(false);
    }
  };

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [parentMessage.id]);

  // Close sidebar on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendReply(content);
    setContent('');
  };

  return (
    <div className="w-[360px] sm:w-[380px] md:w-[400px] border-l border-zinc-950 bg-zinc-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-250 relative">
      {/* Thread Header */}
      <div className="px-4 h-[52px] border-b border-zinc-950 flex items-center justify-between bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white text-sm">Luồng thảo luận</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message and Replies List */}
      <div 
        ref={repliesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 no-scrollbar bg-zinc-900/10"
      >
        {/* Thread Root Parent Message */}
        <div className="bg-zinc-950/25 rounded-xl p-3 border border-zinc-850/80 shadow-sm">
          <div className="text-[10px] text-zinc-500 font-bold tracking-wider uppercase mb-2 select-none">
            Tin nhắn gốc
          </div>
          <MessageItem 
            msg={parentMessage} 
            onReplyClick={() => {}} 
            isReplyChild={true} 
            hideReply={true} 
          />
        </div>

        <div className="flex items-center gap-2 my-1 select-none">
          <div className="flex-1 h-[1px] bg-zinc-850" />
          <span className="text-[9px] text-zinc-550 font-bold tracking-widest uppercase">Phản hồi</span>
          <div className="flex-1 h-[1px] bg-zinc-850" />
        </div>

        {/* Replies List */}
        <div className="flex flex-col gap-3">
          {parentMessage.replies && parentMessage.replies.length > 0 ? (
            parentMessage.replies.map((reply) => (
              <MessageItem 
                key={reply.id} 
                msg={reply} 
                onReplyClick={() => {}} 
                isReplyChild={true} 
                hideReply={true} 
                unreadTimestamp={unreadTimestamp}
              />
            ))
          ) : (
            <div className="text-center py-10 text-zinc-600 text-xs select-none">
              Chưa có câu trả lời nào. Hãy là người đầu tiên phản hồi!
            </div>
          )}
        </div>
      </div>

      {/* Floating New Replies Badge */}
      {showNewRepliesBadge && (
        <button
          type="button"
          onClick={() => {
            if (repliesRef.current) {
              repliesRef.current.scrollTop = repliesRef.current.scrollHeight;
            }
            setShowNewRepliesBadge(false);
          }}
          className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-semibold py-1.5 px-3.5 rounded-full shadow-md border border-indigo-400/30 backdrop-blur-md transition-all duration-200 flex items-center gap-1 z-20 cursor-pointer animate-bounce outline-none"
        >
          <span>Phản hồi mới ở phía dưới</span>
          <ArrowDown className="w-3.5 h-3.5 animate-pulse" />
        </button>
      )}

      {/* Dedicated Thread Message Input */}
      <form 
        onSubmit={handleSubmit} 
        className="p-4 border-t border-zinc-950 bg-zinc-900/40 backdrop-blur-md"
      >
        <div className="flex gap-2 bg-zinc-950 border border-zinc-850 rounded-xl p-1.5 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20 transition duration-200">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Trả lời @${parentMessage.username}...`}
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder-zinc-500 outline-none border-0 min-w-0"
          />
          <button
            type="submit"
            disabled={!content.trim()}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-900 disabled:text-zinc-700 text-white rounded-lg transition shrink-0 cursor-pointer outline-none border-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
