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
  displayContent: string;
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
      <mark key={i} className="bg-amber-500/20 dark:bg-amber-500/35 text-amber-900 dark:text-amber-200 font-semibold rounded px-0.5">
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

interface SearchPill {
  type: 'from' | 'in' | 'has' | 'mentions';
  value: string;
  raw: string;
}

function parsePillsAndInput(query: string) {
  const pills: SearchPill[] = [];
  let remainingText = query;
  
  const regex = /(từ|trong|có|đề cập):("[^"]+"|[^\s]+)/g;
  let match;
  const matches: { fullMatch: string; key: string; val: string; index: number }[] = [];
  
  while ((match = regex.exec(query)) !== null) {
    matches.push({
      fullMatch: match[0],
      key: match[1],
      val: match[2],
      index: match.index
    });
  }
  
  for (const m of matches) {
    const isAtEnd = (m.index + m.fullMatch.length) === query.length;
    const isFollowedBySpace = query[m.index + m.fullMatch.length] === ' ';
    
    if (!isAtEnd || isFollowedBySpace) {
      let type: 'from' | 'in' | 'has' | 'mentions' = 'from';
      if (m.key === 'trong') type = 'in';
      else if (m.key === 'có') type = 'has';
      else if (m.key === 'đề cập') type = 'mentions';
      
      let cleanVal = m.val;
      if (cleanVal.startsWith('"') && cleanVal.endsWith('"')) {
        cleanVal = cleanVal.slice(1, -1);
      }
      
      pills.push({
        type,
        value: cleanVal,
        raw: m.fullMatch
      });
      
      remainingText = remainingText.replace(m.fullMatch, '');
    }
  }
  
  return { pills, remainingText: remainingText.trim() };
}

interface SearchFilters {
  fromUser?: string;
  inChannel?: string;
  hasType?: string;
  mentionsUser?: string;
  textQuery: string;
}

function parseSearchQuery(query: string): SearchFilters {
  const filters: SearchFilters = { textQuery: '' };
  const regex = /(từ|trong|có|đề cập):("[^"]+"|[^\s]+)/g;
  let match;
  let remainingText = query;
  
  while ((match = regex.exec(query)) !== null) {
    const key = match[1];
    let val = match[2];
    
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    
    if (key === 'từ') filters.fromUser = val;
    else if (key === 'trong') filters.inChannel = val;
    else if (key === 'có') filters.hasType = val;
    else if (key === 'đề cập') filters.mentionsUser = val;
    
    remainingText = remainingText.replace(match[0], '');
  }
  
  filters.textQuery = remainingText.replace(/\s+/g, ' ').trim();
  return filters;
}

function formatMessageContentForSearch(content: string): string {
  if (content.startsWith('[image:')) {
    const parts = content.slice(7, -1).split('|');
    const fileName = parts[1] || 'Hình ảnh';
    return `📷 Ảnh: ${fileName}`;
  }
  if (content.startsWith('[file:')) {
    const parts = content.slice(6, -1).split('|');
    const fileName = parts[1] || 'Tệp đính kèm';
    const size = parts[2] ? ` (${parts[2]})` : '';
    return `📁 Tệp: ${fileName}${size}`;
  }
  if (content.startsWith('[call:')) {
    const callType = content.includes('video') ? 'video' : 'thoại';
    return `📞 Cuộc gọi ${callType}`;
  }
  if (content.startsWith('[reply:')) {
    const match = content.match(/^\[reply:[^\]]+\]\s*(.*)$/);
    return match ? match[1] : content;
  }
  if (content.startsWith('[uploading:')) {
    return '⏳ Đang tải lên tệp...';
  }
  return content;
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
  const { 
    activeWorkspaceId, 
    setActiveChannelId, 
    setScrollToMessageId, 
    searchQuery, 
    setSearchQuery 
  } = useChatStore();
  
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
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const { pills, remainingText } = parsePillsAndInput(searchQuery);

  const handleRemovePill = (pillIndex: number) => {
    const updatedPills = pills.filter((_, idx) => idx !== pillIndex);
    const newQuery = updatedPills.map(p => p.raw).join(' ') + (updatedPills.length > 0 ? ' ' : '') + remainingText;
    setSearchQuery(newQuery);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !e.currentTarget.value) {
      if (pills.length > 0) {
        e.preventDefault();
        const lastPill = pills[pills.length - 1];
        const remainingPills = pills.slice(0, -1);
        
        const lastPillText = lastPill.raw;
        const newQuery = remainingPills.map(p => p.raw).join(' ') + (remainingPills.length > 0 ? ' ' : '') + lastPillText;
        
        setSearchQuery(newQuery);
        
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(lastPillText.length, lastPillText.length);
          }
        }, 0);
      }
    }
  };

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
        results.push({ 
          msg, 
          channel, 
          dmChannel, 
          channelName,
          displayContent: formatMessageContentForSearch(msg.content)
        });
      }
    }

    return results;
  }, [queryClient, channels, dmChannels, currentUser?.id]);

  const parsedFilters = useMemo(() => parseSearchQuery(debouncedQuery), [debouncedQuery]);

  // Filter by query
  const filteredResults = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const filters = parsedFilters;
    const q = filters.textQuery.toLowerCase();
    
    return allMessages
      .filter((r) => {
        // 1. Text Query filter
        if (q && !r.displayContent.toLowerCase().includes(q) && !r.msg.username.toLowerCase().includes(q)) {
          return false;
        }
        
        // 2. từ: (From User) filter
        if (filters.fromUser) {
          const fromU = filters.fromUser.toLowerCase();
          if (r.msg.username.toLowerCase() !== fromU && r.msg.user_id !== fromU) {
            return false;
          }
        }
        
        // 3. trong: (In Channel) filter
        if (filters.inChannel) {
          const inC = filters.inChannel.toLowerCase();
          const cleanChanName = r.channelName.startsWith('#') ? r.channelName.slice(1) : r.channelName;
          if (cleanChanName.toLowerCase() !== inC && r.msg.channel_id !== inC) {
            return false;
          }
        }
        
        // 4. có: (Has data type) filter: link, file/tệp, image/ảnh, call/cuộc-gọi
        if (filters.hasType) {
          const type = filters.hasType.toLowerCase();
          const content = r.msg.content;
          
          if (type === 'link') {
            const hasLink = /https?:\/\/[^\s]+/.test(content);
            if (!hasLink) return false;
          } else if (type === 'tệp' || type === 'file') {
            if (!content.startsWith('[file:')) return false;
          } else if (type === 'ảnh' || type === 'image') {
            if (!content.startsWith('[image:')) return false;
          } else if (type === 'cuộc-gọi' || type === 'call') {
            if (!content.startsWith('[call:')) return false;
          } else {
            return false;
          }
        }
        
        // 5. đề cập: (Mentions User) filter
        if (filters.mentionsUser) {
          const mentionsU = filters.mentionsUser.toLowerCase();
          if (!r.msg.content.toLowerCase().includes(`@${mentionsU}`)) {
            return false;
          }
        }
        
        return true;
      })
      .sort((a, b) => {
        const ta = typeof a.msg.timestamp === 'string' ? new Date(a.msg.timestamp).getTime() : Number(a.msg.timestamp);
        const tb = typeof b.msg.timestamp === 'string' ? new Date(b.msg.timestamp).getTime() : Number(b.msg.timestamp);
        return tb - ta;
      })
      .slice(0, 50);
  }, [debouncedQuery, allMessages, parsedFilters]);

  const handleNavigate = (result: SearchResult) => {
    // Save to recent searches
    const newRecent = [searchQuery, ...recentSearches.filter((r) => r !== searchQuery)].slice(0, 5);
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
        <div className="flex items-center flex-wrap gap-1.5 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5 min-h-[38px] focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/20 transition">
          <Search className="w-4 h-4 text-zinc-500 shrink-0" />
          
          {/* Display completed pills */}
          {pills.map((pill, idx) => (
            <div 
              key={idx}
              className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-400 rounded px-1.5 py-0.5 text-[10px] font-bold select-none cursor-default"
            >
              <span>{pill.type === 'from' ? 'từ' : pill.type === 'in' ? 'trong' : pill.type === 'has' ? 'có' : 'đề cập'}: {pill.value}</span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blurring the input
                  handleRemovePill(idx);
                }}
                className="hover:bg-indigo-500/20 rounded p-0.5 text-indigo-450 hover:text-white transition cursor-pointer border-0 outline-none bg-transparent"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}

          <input
            ref={inputRef}
            type="text"
            value={remainingText}
            onChange={(e) => {
              const newVal = e.target.value;
              const newQuery = pills.map(p => p.raw).join(' ') + (pills.length > 0 ? ' ' : '') + newVal;
              setSearchQuery(newQuery);
            }}
            onKeyDown={handleKeyDown}
            placeholder={pills.length === 0 ? "Tìm kiếm tin nhắn..." : ''}
            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-550 outline-none border-0 min-w-[60px]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-zinc-500 hover:text-white transition border-0 outline-none cursor-pointer ml-auto"
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
                  onClick={() => setSearchQuery(recent)}
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
                        {highlightText(result.displayContent, parsedFilters.textQuery)}
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
