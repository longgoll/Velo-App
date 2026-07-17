import { useRef, useEffect, useState } from 'react';
import { X, MessageSquare, Send, ArrowDown, Megaphone } from 'lucide-react';
import type { ChatMessage } from '@/types';
import MessageItem from './MessageItem';
import { useChatStore } from '@/store/useChatStore';
import { getAvatarGradient } from '@/lib/utils';
import { useMentionAutocomplete } from '../hooks/useMentionAutocomplete';

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
  unreadTimestamp,
}: ThreadSidebarProps) {
  const [content, setContent] = useState('');
  const [showNewRepliesBadge, setShowNewRepliesBadge] = useState(false);
  const repliesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInitialLoad = useRef(true);

  const { activeWorkspaceId } = useChatStore();

  // Use the extracted Mention Autocomplete hook
  const {
    mentionQuery,
    selectedIndex,
    setSelectedIndex,
    filteredSuggestions,
    handleSelectSuggestion,
    handleKeyDown,
    updateMentionStatus,
  } = useMentionAutocomplete({
    activeWorkspaceId,
    channelId: parentMessage.channel_id,
    currentUser,
    text: content,
    setText: setContent,
    inputRef,
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart;
    updateMentionStatus(val, cursor);
    setSelectedIndex(0);
  };

  // Auto scroll replies
  const repliesCount = parentMessage.replies?.length || 0;
  useEffect(() => {
    const container = repliesRef.current;
    if (!container) return;

    if (isInitialLoad.current) {
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
    const handleKeyDownEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mentionQuery === null) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDownEsc);
    return () => window.removeEventListener('keydown', handleKeyDownEsc);
  }, [onClose, mentionQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onSendReply(content);
    setContent('');
  };

  return (
    <div className="w-[360px] sm:w-[380px] md:w-[400px] border-l border-zinc-200 dark:border-zinc-950 bg-zinc-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-250 relative">
      {/* Thread Header */}
      <div className="px-4 h-[52px] border-b border-zinc-200 dark:border-zinc-950 flex items-center justify-between bg-white dark:bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white text-sm">Luồng thảo luận</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 text-zinc-550 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer"
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
          <div className="text-[10px] text-zinc-550 font-bold tracking-wider uppercase mb-2 select-none">
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
          <div className="flex-1 h-[1px] bg-zinc-855" />
          <span className="text-[9px] text-zinc-550 font-bold tracking-widest uppercase">Phản hồi</span>
          <div className="flex-1 h-[1px] bg-zinc-855" />
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
            <div className="text-center py-10 text-zinc-650 text-xs select-none">
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
        className="p-4 border-t border-zinc-950 bg-zinc-900/40 backdrop-blur-md relative"
      >
        {/* Mention Auto-complete popover */}
        {mentionQuery !== null && filteredSuggestions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden max-h-[200px] overflow-y-auto z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex flex-col">
              {filteredSuggestions.map((item, idx) => {
                const isSelected = idx === selectedIndex;
                const isSpecial = item.type === 'special';
                const isInChannel = item.inChannel !== false;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectSuggestion(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors duration-150 border-b border-zinc-900/50 last:border-0 ${
                      isSelected ? 'bg-zinc-800/80 text-white' : 'text-zinc-300 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {isSpecial ? (
                        <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-455 shrink-0">
                          <Megaphone className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="relative shrink-0">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white border border-white/5 shadow-sm ${getAvatarGradient(item.label)}`}>
                            {item.label.slice(0, 1).toUpperCase()}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-950 ${
                            item.isOnline ? 'bg-emerald-500' : 'bg-zinc-550'
                          }`} />
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 text-left">
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-[11px] truncate">
                            {isSpecial ? `@${item.label}` : item.label}
                          </span>
                          {!isSpecial && item.isOnline && (
                            <span className="w-1 h-1 rounded-full bg-emerald-500 inline-block" />
                          )}
                        </div>
                        <span className="text-[9px] text-zinc-500 truncate">
                          {isSpecial ? item.description : item.email}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isInChannel && (
                        <span className="text-[8px] font-semibold text-zinc-550 tracking-wide uppercase px-1.5 py-0.5 bg-zinc-900 border border-zinc-850 rounded-md shadow-sm">
                          Không có trong kênh
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[8px] font-mono text-zinc-450 bg-zinc-900 border border-zinc-850 px-1 py-0.5 rounded shadow-sm">
                          Enter
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 bg-zinc-950 border border-zinc-850 rounded-xl p-1.5 focus-within:border-indigo-500/40 focus-within:ring-1 focus-within:ring-indigo-500/20 transition duration-200">
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onKeyUp={(e) => {
              const cursor = (e.target as HTMLInputElement).selectionStart;
              updateMentionStatus(content, cursor);
            }}
            onSelect={(e) => {
              const cursor = (e.target as HTMLInputElement).selectionStart;
              updateMentionStatus(content, cursor);
            }}
            onClick={(e) => {
              const cursor = (e.target as HTMLInputElement).selectionStart;
              updateMentionStatus(content, cursor);
            }}
            placeholder={`Trả lời @${parentMessage.username}...`}
            className="flex-1 bg-transparent px-3 py-1.5 text-sm text-white placeholder-zinc-550 outline-none border-0 min-w-0"
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
