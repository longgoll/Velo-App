import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Hash, PhoneCall, Video, MessageSquare } from 'lucide-react';
import type { Channel, ChatMessage } from '@/types';
import MessageItem from './MessageItem';
import ChatInput from './ChatInput';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatViewportProps {
  onSendMessage: (channelId: string, content: string) => void;
}

export default function ChatViewport({ onSendMessage }: ChatViewportProps) {
  const { activeWorkspaceId, activeChannelId, explorerOpen, toggleExplorer } = useChatStore();
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch channels list to find active channel name
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
  });

  const activeChannel = channels.find((c) => c.id === activeChannelId);

  // Fetch messages from TanStack cache
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['messages', activeChannelId],
    queryFn: async () => {
      // Fallback/Placeholder: initially returns empty array.
      // Real-time messages will be populated by WebSocket hook into this queryKey.
      return [];
    },
    enabled: !!activeChannelId,
  });

  // Auto Scroll to Bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!activeChannelId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-900 text-center select-none">
        <div className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-500 mb-4 animate-bounce">
          <MessageSquare className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white">Chọn Workspace hoặc Kênh để bắt đầu chat</h3>
        <p className="text-zinc-500 text-sm mt-1 max-w-sm">
          Tạo không gian làm việc của riêng bạn hoặc gia nhập qua ID để khám phá các cuộc hội thoại thời gian thực.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-zinc-900 flex flex-col justify-between h-full min-w-0">
      {/* Chat Header */}
      <div className="px-6 h-[52px] border-b border-zinc-950 flex items-center justify-between bg-zinc-900 shadow-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Hash className="w-5 h-5 text-zinc-500 shrink-0" />
          <span className="font-bold text-white text-sm truncate">
            {activeChannel?.name || 'Kênh chat'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none">
            <PhoneCall className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none">
            <Video className="w-4 h-4" />
          </button>
          <button
            onClick={toggleExplorer}
            className="px-3 py-1 bg-zinc-800 text-xs text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition outline-none"
            title="Ctrl + B"
          >
            {explorerOpen ? 'Ẩn Sidebar' : 'Hiện Sidebar'}
          </button>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 px-6 py-4">
        <div className="flex flex-col gap-4">
          {messages.map((msg, idx) => (
            <MessageItem key={msg.id || idx} msg={msg} />
          ))}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-600 select-none">
              <p className="text-sm">Đây là khởi đầu của kênh #{activeChannel?.name}</p>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <ChatInput
        activeChannelId={activeChannelId}
        channelName={activeChannel?.name || 'Kênh chat'}
        onSendMessage={onSendMessage}
      />
    </div>
  );
}
