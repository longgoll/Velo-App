import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Hash, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getAvatarGradient } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { ChatMessage, Channel, DMChannel } from '@/types';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
interface SearchResult {
  msg: ChatMessage;
  channel?: Channel;
  dmChannel?: DMChannel;
  channelName: string;
}

interface SearchPanelProps {
  onClose: () => void;
  onNavigateToChannel: (channelId: string) => void;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-amber-500/30 text-amber-300 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function formatTimestamp(ts: string | number): string {
  const d = typeof ts === 'string' ? new Date(ts) : new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Hôm qua';
  if (days < 7) return `${days} ngày trước`;
  return d.toLocaleDateString('vi-VN');
}

function isMediaMessage(content: string): boolean {
  return (
    content.startsWith('[image:') ||
    content.startsWith('[file:') ||
    content.startsWith('[call:') ||
    content.startsWith('[reply:') ||
    content.startsWith('[uploading:')
  );
}

export default function SearchPanel({ onClose, onNavigateToChannel }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('recentSearches') || '[]');
    } catch {
      return [];
    }
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { activeWorkspaceId, setActiveChannelId, setScrollToMessageId } = useChatStore();
  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Fetch channels + DMs to resolve channel names
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: dmChannels = [] } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Collect all cached messages from queryClient
  const allMessages = useMemo((): SearchResult[] => {
    const cache = queryClient.getQueriesData<any>({ queryKey: ['messages'] });
    const results: SearchResult[] = [];

    for (const [queryKey, data] of cache) {
      if (!data) continue;
      const channelId = (queryKey as any[])[1] as string;

      const channel = channels.find((c) => c.id === channelId);
      const dmChannel = dmChannels.find((d) => d.id === channelId);

      let channelName = channelId;
      if (channel) {
        channelName = `#${channel.name}`;
      } else if (dmChannel) {
        const other =
          dmChannel.user_one_id === currentUser?.id ? dmChannel.user_two : dmChannel.user_one;
        channelName = `@${other?.username || 'DM'}`;
      }

      // Handle InfiniteQuery pages format
      const pages = data.pages as ChatMessage[][] | undefined;
      const msgs: ChatMessage[] = pages ? pages.flat() : Array.isArray(data) ? data : [];

      for (const msg of msgs) {
        if (!isMediaMessage(msg.content)) {
          results.push({ msg, channel, dmChannel, channelName });
        }
      }
    }

    return results;
  }, [queryClient, channels, dmChannels, currentUser?.id]);

  // Filter by query
  const filteredResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase();
    return allMessages
      .filter(
        (r) =>
          r.msg.content.toLowerCase().includes(q) ||
          r.msg.username.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const ta = typeof a.msg.timestamp === 'string' ? new Date(a.msg.timestamp).getTime() : Number(a.msg.timestamp);
        const tb = typeof b.msg.timestamp === 'string' ? new Date(b.msg.timestamp).getTime() : Number(b.msg.timestamp);
        return tb - ta;
      })
      .slice(0, 50);
  }, [debouncedQuery, allMessages]);

  const handleNavigate = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [query, ...recentSearches.filter((r) => r !== query)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('recentSearches', JSON.stringify(newRecent));

    const targetMsgId = result.msg.id;
    const targetChannelId = result.msg.channel_id;
    const channelType = result.dmChannel ? 'dm' : 'channel';

    // Close the panel first (so layout changes happen before we scroll)
    onClose();

    // Navigate to channel + set scroll target (batched in next tick)
    setTimeout(() => {
      setActiveChannelId(targetChannelId, channelType, activeWorkspaceId || undefined);
      setScrollToMessageId(targetMsgId);
      onNavigateToChannel(targetChannelId);
    }, 0);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div className="w-[380px] border-l border-zinc-200 dark:border-zinc-950 bg-zinc-900 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-250 relative">
      {/* Header */}
      <div className="px-4 h-[52px] border-b border-zinc-950 flex items-center gap-3 bg-zinc-900/40 backdrop-blur-md shrink-0">
        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
        <span className="font-bold text-white text-sm">Tìm kiếm tin nhắn</span>
        <button
          onClick={onClose}
          className="ml-auto p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-zinc-950/80 shrink-0">
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm kiếm tin nhắn..."
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-550 outline-none border-0 min-w-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-zinc-500 hover:text-white transition border-0 outline-none cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {debouncedQuery && (
          <p className="text-[10px] text-zinc-550 mt-2 font-medium">
            {filteredResults.length > 0
              ? `${filteredResults.length} kết quả cho "${debouncedQuery}"`
              : `Không tìm thấy kết quả cho "${debouncedQuery}"`}
          </p>
        )}
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-2">
          {/* Recent Searches (shown when empty) */}
          {!debouncedQuery && recentSearches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3 h-3" />
                  Tìm kiếm gần đây
                </span>
                <button
                  onClick={clearRecentSearches}
                  className="text-[9px] text-zinc-550 hover:text-zinc-300 transition border-0 outline-none cursor-pointer bg-transparent"
                >
                  Xóa tất cả
                </button>
              </div>
              {recentSearches.map((recent, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(recent)}
                  className="w-full flex items-center gap-2.5 p-2.5 bg-zinc-950/30 border border-zinc-850 rounded-xl hover:bg-zinc-850 hover:border-zinc-750 transition text-left cursor-pointer outline-none"
                >
                  <Clock className="w-3.5 h-3.5 text-zinc-550 shrink-0" />
                  <span className="text-sm text-zinc-300 truncate">{recent}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-650 ml-auto shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Empty hint when no query */}
          {!debouncedQuery && recentSearches.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-300">Tìm kiếm tin nhắn</p>
              <p className="text-xs text-zinc-550 mt-1 max-w-[220px]">
                Nhập từ khóa để tìm tin nhắn trong các kênh đã tải
              </p>
            </div>
          )}

          {/* No results */}
          {debouncedQuery && filteredResults.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center select-none">
              <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 border border-zinc-750 flex items-center justify-center text-zinc-550 mb-4">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-zinc-400">Không tìm thấy kết quả</p>
              <p className="text-xs text-zinc-550 mt-1 max-w-[220px]">
                Hãy mở thêm kênh để tải dữ liệu trước khi tìm kiếm
              </p>
            </div>
          )}

          {/* Results */}
          {filteredResults.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest">
                Kết quả
              </span>
              {filteredResults.map((result, idx) => (
                <button
                  key={`${result.msg.id}-${idx}`}
                  onClick={() => handleNavigate(result)}
                  className="w-full flex flex-col gap-2 p-3 bg-zinc-950/30 border border-zinc-850 rounded-xl hover:bg-zinc-850 hover:border-zinc-750 transition text-left cursor-pointer outline-none group"
                >
                  {/* Top row: channel + time */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-zinc-550">
                      <Hash className="w-2.5 h-2.5" />
                      <span>{result.channelName}</span>
                    </div>
                    <span className="text-[9px] text-zinc-650 font-mono">
                      {formatTimestamp(result.msg.timestamp)}
                    </span>
                  </div>

                  {/* Message row: avatar + username + content */}
                  <div className="flex items-start gap-2.5">
                    <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                      <AvatarFallback
                        className={`text-[9px] font-bold text-white ${getAvatarGradient(result.msg.username)}`}
                      >
                        {result.msg.username.slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white transition">
                        {result.msg.username}
                      </span>
                      <p className="text-xs text-zinc-450 mt-0.5 leading-relaxed line-clamp-3 break-words">
                        {highlightText(result.msg.content, debouncedQuery)}
                      </p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-650 shrink-0 mt-1 group-hover:text-indigo-400 transition" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
