import { useState, useRef, useEffect } from 'react';
import { 
  Hash, PhoneCall, Video, Search, Bell, Pin, Users, 
  X, SlidersHorizontal, User, Paperclip, Link2, Image 
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useChatStore } from '@/store/useChatStore';
import { getAvatarGradient } from '@/lib/utils';
import type { WorkspaceMember, Channel } from '@/types';

interface ActiveToken {
  type: 'from' | 'in' | 'has' | 'mentions' | 'text' | null;
  value: string;
  startIndex: number;
}

function getActiveToken(text: string, cursorPosition: number): ActiveToken {
  const textBeforeCursor = text.slice(0, cursorPosition);
  
  const keywords = [
    { key: 'từ:', type: 'from' as const },
    { key: 'trong:', type: 'in' as const },
    { key: 'có:', type: 'has' as const },
    { key: 'đề cập:', type: 'mentions' as const }
  ];
  
  let bestMatch = { type: null as any, key: '', index: -1 };
  
  for (const kw of keywords) {
    const idx = textBeforeCursor.lastIndexOf(kw.key);
    if (idx !== -1 && idx > bestMatch.index) {
      bestMatch = { type: kw.type, key: kw.key, index: idx };
    }
  }
  
  if (bestMatch.index !== -1) {
    const afterKeyword = textBeforeCursor.slice(bestMatch.index + bestMatch.key.length);
    if (!afterKeyword.includes(' ')) {
      return {
        type: bestMatch.type,
        value: afterKeyword,
        startIndex: bestMatch.index
      };
    }
  }
  
  return { type: null, value: '', startIndex: -1 };
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

interface ChatHeaderProps {
  activeDmChannel: any;
  chatTitle: string;
  handleStartVoiceCall: () => void;
  handleStartVideoCall: () => void;
  showDetails: boolean;
  setShowDetails: (val: boolean) => void;
  setActiveThreadId: (val: string | null) => void;
  toggleExplorer: () => void;
  explorerOpen: boolean;
  showSearch: boolean;
  setShowSearch: (val: boolean) => void;
  showNotifications: boolean;
  setShowNotifications: (val: boolean) => void;
  showPins: boolean;
  setShowPins: (val: boolean) => void;
  activeChannelId: string | null;
  workspaceName?: string;
}

export function ChatHeader({
  activeDmChannel,
  chatTitle,
  handleStartVoiceCall,
  handleStartVideoCall,
  showDetails,
  setShowDetails,
  setActiveThreadId,
  toggleExplorer,
  explorerOpen,
  showSearch,
  setShowSearch,
  showNotifications,
  setShowNotifications,
  showPins,
  setShowPins,
  activeChannelId,
  workspaceName,
}: ChatHeaderProps) {
  // Unread notification count badge
  const { data: unreadData } = useQuery<{ unread_count: number }>({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return res.data;
    },
    refetchInterval: 30000,
  });
  const unreadCount = unreadData?.unread_count ?? 0;

  // Pin count badge
  const { data: pinsData } = useQuery<any[]>({
    queryKey: ['pins', activeChannelId],
    queryFn: async () => {
      if (!activeChannelId) return [];
      const res = await api.get(`/channels/${activeChannelId}/pins`);
      return res.data;
    },
    enabled: !!activeChannelId,
  });
  const pinCount = pinsData?.length ?? 0;

  const closeOtherPanels = (except: 'search' | 'notifications' | 'pins' | 'details') => {
    if (except !== 'search') setShowSearch(false);
    if (except !== 'notifications') setShowNotifications(false);
    if (except !== 'pins') setShowPins(false);
    if (except !== 'details') setShowDetails(false);
    setActiveThreadId(null);
  };

  const { activeWorkspaceId, searchQuery, setSearchQuery } = useChatStore();
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorPos, setCursorPos] = useState(0);

  // Fetch workspace members for search autocomplete
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
  });

  // Fetch channels for search autocomplete
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
  });

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Parse current query into completed pills and remaining typing text
  const { pills, remainingText } = parsePillsAndInput(searchQuery);

  // Active token being typed is checked on the remaining input text
  const activeToken = getActiveToken(remainingText, cursorPos);

  // Filter members matching query
  const matchingMembers = members.filter(m => {
    const name = m.user?.username || '';
    return name.toLowerCase().includes(activeToken.value.toLowerCase());
  }).slice(0, 5);

  // Filter channels matching query
  const matchingChannels = channels.filter(c => {
    const name = c.name || '';
    return name.toLowerCase().includes(activeToken.value.toLowerCase());
  }).slice(0, 5);

  // Define media types for "có:"
  const mediaTypes = [
    { label: 'Liên kết / URL', value: 'link', icon: Link2 },
    { label: 'Tệp đính kèm', value: 'tệp', icon: Paperclip },
    { label: 'Hình ảnh', value: 'ảnh', icon: Image },
    { label: 'Cuộc gọi', value: 'cuộc-gọi', icon: PhoneCall },
  ];
  const matchingMedia = mediaTypes.filter(m => m.value.includes(activeToken.value.toLowerCase()));

  const handleSelectModifier = (modifier: string) => {
    const input = inputRef.current;
    if (!input) return;
    
    let newRemaining = remainingText;
    if (!newRemaining) {
      newRemaining = modifier;
    } else if (newRemaining.endsWith(' ')) {
      newRemaining = newRemaining + modifier;
    } else {
      newRemaining = newRemaining + ' ' + modifier;
    }
    
    const newQuery = pills.map(p => p.raw).join(' ') + (pills.length > 0 ? ' ' : '') + newRemaining;
    setSearchQuery(newQuery);
    
    setTimeout(() => {
      input.focus();
      const len = newRemaining.length;
      input.setSelectionRange(len, len);
      setCursorPos(len);
    }, 0);
  };

  const handleSelectSuggestion = (selectedValue: string) => {
    const input = inputRef.current;
    if (!input) return;
    
    const activeTok = getActiveToken(remainingText, input.selectionStart || 0);
    
    if (activeTok.type && activeTok.startIndex !== -1) {
      const prefix = activeTok.type === 'from' ? 'từ:' : 
                     activeTok.type === 'in' ? 'trong:' : 
                     activeTok.type === 'has' ? 'có:' : 'đề cập:';
                     
      const beforeToken = remainingText.slice(0, activeTok.startIndex);
      const afterToken = remainingText.slice(input.selectionStart || 0);
      
      const formattedVal = selectedValue.includes(' ') ? `"${selectedValue}"` : selectedValue;
      const completedToken = prefix + formattedVal + ' '; // Trailing space turns it into a pill on next render
      
      const newRemaining = beforeToken + completedToken + afterToken;
      const newQuery = pills.map(p => p.raw).join(' ') + (pills.length > 0 ? ' ' : '') + newRemaining;
      
      setSearchQuery(newQuery);
      
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(0, 0);
        setCursorPos(0);
      }, 0);
    }
  };

  const handleRemovePill = (pillIndex: number) => {
    const updatedPills = pills.filter((_, idx) => idx !== pillIndex);
    const newQuery = updatedPills.map(p => p.raw).join(' ') + (updatedPills.length > 0 ? ' ' : '') + remainingText;
    setSearchQuery(newQuery);
    
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      closeOtherPanels('search');
      setShowSearch(true);
      inputRef.current?.blur();
      setIsFocused(false);
    } else if (e.key === 'Escape') {
      inputRef.current?.blur();
      setIsFocused(false);
    } else if (e.key === 'Backspace' && !e.currentTarget.value) {
      if (pills.length > 0) {
        e.preventDefault();
        const lastPill = pills[pills.length - 1];
        const remainingPills = pills.slice(0, -1);
        
        // Convert the last pill back to editable text in the input
        const lastPillText = lastPill.raw;
        const newQuery = remainingPills.map(p => p.raw).join(' ') + (remainingPills.length > 0 ? ' ' : '') + lastPillText;
        
        setSearchQuery(newQuery);
        
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            const len = lastPillText.length;
            inputRef.current.setSelectionRange(len, len);
            setCursorPos(len);
          }
        }, 0);
      }
    }
  };

  return (
    <div 
      className="px-6 h-[52px] border-b flex items-center justify-between shadow-sm shrink-0 z-10 backdrop-blur-md"
      style={{ 
        backgroundColor: 'var(--bg-app-chat)', 
        borderColor: 'var(--border-app)' 
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {activeDmChannel ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        ) : (
          <Hash className="w-5 h-5 text-zinc-550 shrink-0" />
        )}
        <span 
          className="font-bold text-sm truncate"
          style={{ color: 'var(--text-app-primary)' }}
        >
          {chatTitle}
        </span>
        {activeDmChannel ? (
          <span className="text-[8px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full select-none ml-2 uppercase tracking-wide">
            Trực tuyến
          </span>
        ) : (
          <span className="text-[8px] font-bold text-indigo-450 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full select-none ml-2 uppercase tracking-wide">
            Hoạt động
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        {activeDmChannel && (
          <>
            <button
              onClick={handleStartVoiceCall}
              className="p-2 hover:bg-zinc-800 rounded-full hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
              style={{ color: 'var(--text-app-secondary)' }}
              title="Bắt đầu cuộc gọi thoại"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartVideoCall}
              className="p-2 hover:bg-zinc-800 rounded-full hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
              style={{ color: 'var(--text-app-secondary)' }}
              title="Bắt đầu cuộc gọi video"
            >
              <Video className="w-4 h-4" />
            </button>
            <div 
              className="w-px h-4 mx-1"
              style={{ backgroundColor: 'var(--border-app)' }}
            />
          </>
        )}

        {/* 2. Notifications */}
        <button
          onClick={() => {
            const next = !showNotifications;
            closeOtherPanels('notifications');
            setShowNotifications(next);
          }}
          className={`relative p-2 rounded-full transition outline-none border-0 cursor-pointer ${
            showNotifications
              ? 'bg-indigo-600/15 text-indigo-400 hover:bg-indigo-500/25'
              : 'hover:bg-zinc-800 hover:text-white'
          }`}
          style={{
            color: showNotifications ? undefined : 'var(--text-app-secondary)',
          }}
          title="Thông báo"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-rose-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* 3. Pinned Messages */}
        {!activeDmChannel && (
          <button
            onClick={() => {
              const next = !showPins;
              closeOtherPanels('pins');
              setShowPins(next);
            }}
            className={`relative p-2 rounded-full transition outline-none border-0 cursor-pointer ${
              showPins
                ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25'
                : 'hover:bg-zinc-800 hover:text-white'
            }`}
            style={{
              color: showPins ? undefined : 'var(--text-app-secondary)',
            }}
            title="Tin nhắn đã ghim"
          >
            <Pin className="w-4 h-4" />
            {pinCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] bg-amber-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none pointer-events-none">
                {pinCount}
              </span>
            )}
          </button>
        )}

        {/* 4. Details / Member list (👥 icon) */}
        <button
          onClick={() => {
            const next = !showDetails;
            closeOtherPanels('details');
            setShowDetails(next);
          }}
          className={`p-2 rounded-full transition outline-none border-0 cursor-pointer ${
            showDetails 
              ? 'bg-indigo-600/15 text-indigo-400 hover:bg-indigo-500/25' 
              : 'hover:bg-zinc-800 hover:text-white'
          }`}
          style={{
            color: showDetails ? undefined : 'var(--text-app-secondary)',
          }}
          title="Thông tin nhóm / bạn bè"
        >
          <Users className="w-4 h-4" />
        </button>

        {/* Separator */}
        <div 
          className="w-px h-4 mx-1"
          style={{ backgroundColor: 'var(--border-app)' }}
        />

        {/* 5. Search bar inside header */}
        <div className="relative" ref={searchRef}>
          <div
            className={`flex items-center flex-wrap gap-1.5 border transition-all duration-200 rounded-lg px-2.5 py-1.5 min-h-[32px] w-48 sm:w-60 md:w-72 focus-within:border-indigo-500/50 focus-within:ring-1 focus-within:ring-indigo-500/10 ${
              isFocused ? 'border-indigo-500/50 ring-1 ring-indigo-500/10' : ''
            }`}
            style={{
              backgroundColor: 'var(--border-app)',
              borderColor: isFocused ? undefined : 'transparent',
            }}
          >
            {/* Display completed pills */}
            {pills.map((pill, idx) => (
              <div 
                key={idx}
                className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 dark:border-indigo-500/30 text-indigo-500 dark:text-indigo-400 rounded px-1.5 py-0.5 text-[10px] font-bold select-none cursor-default"
              >
                <span>{pill.type === 'from' ? 'từ' : pill.type === 'in' ? 'trong' : pill.type === 'has' ? 'có' : 'đề cập'}: {pill.value}</span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault(); // Prevent blurring the input
                    handleRemovePill(idx);
                  }}
                  className="hover:bg-indigo-500/20 rounded p-0.5 text-indigo-500 dark:text-indigo-400 hover:text-white dark:hover:text-white transition cursor-pointer border-0 outline-none bg-transparent"
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
                setCursorPos(e.target.selectionStart || 0);
              }}
              onFocus={() => {
                setIsFocused(true);
                closeOtherPanels('search');
              }}
              onKeyUp={(e) => {
                setCursorPos(e.currentTarget.selectionStart || 0);
              }}
              onKeyDown={handleKeyDown}
              placeholder={pills.length === 0 ? `Tìm kiếm ${workspaceName || 'Tool-VLXD'}` : ''}
              className="flex-1 bg-transparent text-xs text-[var(--text-app-primary)] placeholder-[var(--text-app-secondary)]/50 outline-none border-0 min-w-[60px]"
            />
            {searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  inputRef.current?.focus();
                }}
                className="text-[var(--text-app-secondary)] hover:text-[var(--text-app-primary)] transition border-0 outline-none cursor-pointer bg-transparent ml-auto"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search 
                className="w-3.5 h-3.5 shrink-0 ml-auto"
                style={{ color: 'var(--text-app-secondary)' }}
              />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isFocused && (
            <div 
              className="absolute right-0 mt-1.5 w-72 rounded-xl shadow-xl border z-50 overflow-hidden py-2 animate-in fade-in slide-in-from-top-1 duration-150"
              style={{
                backgroundColor: 'var(--bg-app-sidebar)',
                borderColor: 'var(--border-app)',
              }}
            >
              {/* If no active token (showing general modifier options) */}
              {!activeToken.type ? (
                <div className="space-y-1">
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-app-secondary)] uppercase tracking-wider">
                    <SlidersHorizontal className="w-3 h-3 text-indigo-400" />
                    <span>Bộ lọc</span>
                  </div>
                  
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectModifier('từ:');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors group cursor-pointer border-0 bg-transparent animate-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[var(--text-app-primary)] group-hover:text-indigo-400 transition-colors">Từ một người dùng cụ thể</span>
                        <span className="text-[9px] text-[var(--text-app-secondary)] font-normal">từ: người dùng</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectModifier('trong:');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors group cursor-pointer border-0 bg-transparent animate-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Hash className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[var(--text-app-primary)] group-hover:text-indigo-400 transition-colors">Được gửi trong một kênh cụ thể</span>
                        <span className="text-[9px] text-[var(--text-app-secondary)] font-normal">trong: kênh</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectModifier('có:');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors group cursor-pointer border-0 bg-transparent animate-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Paperclip className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[var(--text-app-primary)] group-hover:text-indigo-400 transition-colors">Bao gồm một loại dữ liệu cụ thể</span>
                        <span className="text-[9px] text-[var(--text-app-secondary)] font-normal">có: link, tệp nhúng hoặc tệp</span>
                      </div>
                    </div>
                  </button>

                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectModifier('đề cập:');
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors group cursor-pointer border-0 bg-transparent animate-none"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-semibold text-[var(--text-app-primary)] group-hover:text-indigo-400 transition-colors">Đề cập một người dùng cụ thể</span>
                        <span className="text-[9px] text-[var(--text-app-secondary)] font-normal">đề cập: người dùng</span>
                      </div>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Headers for active token filters */}
                  <div className="px-3 py-1 flex items-center gap-1.5 text-[10px] font-bold text-[var(--text-app-secondary)] uppercase tracking-wider">
                    {activeToken.type === 'from' && 'Gợi ý người dùng (từ:)'}
                    {activeToken.type === 'mentions' && 'Gợi ý đề cập (đề cập:)'}
                    {activeToken.type === 'in' && 'Gợi ý kênh (trong:)'}
                    {activeToken.type === 'has' && 'Gợi ý định dạng (có:)'}
                  </div>

                  {/* 1. Suggest members */}
                  {(activeToken.type === 'from' || activeToken.type === 'mentions') && (
                    matchingMembers.length > 0 ? (
                      matchingMembers.map((m) => {
                        const username = m.user?.username || 'user';
                        return (
                          <button
                            key={m.user_id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(username);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors cursor-pointer border-0 bg-transparent text-xs animate-none"
                          >
                            <div className={`w-5.5 h-5.5 rounded-full text-[9px] font-bold text-white flex items-center justify-center shrink-0 ${getAvatarGradient(username)}`}>
                              {username.slice(0, 1).toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-app-primary)] truncate">{username}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-[var(--text-app-secondary)] italic">
                        Không tìm thấy người dùng phù hợp
                      </div>
                    )
                  )}

                  {/* 2. Suggest channels */}
                  {activeToken.type === 'in' && (
                    matchingChannels.length > 0 ? (
                      matchingChannels.map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(c.name);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors cursor-pointer border-0 bg-transparent text-xs text-[var(--text-app-primary)] animate-none"
                        >
                          <Hash className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-medium truncate">{c.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-[var(--text-app-secondary)] italic">
                        Không tìm thấy kênh phù hợp
                      </div>
                    )
                  )}

                  {/* 3. Suggest data types */}
                  {activeToken.type === 'has' && (
                    matchingMedia.length > 0 ? (
                      matchingMedia.map((m) => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.value}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectSuggestion(m.value);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800/60 midnight:hover:bg-zinc-900/60 transition-colors cursor-pointer border-0 bg-transparent text-xs text-[var(--text-app-primary)] animate-none"
                          >
                            <Icon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="font-medium">{m.label}</span>
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-[var(--text-app-secondary)] italic">
                        Không tìm thấy định dạng phù hợp
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={toggleExplorer}
          className="px-3 py-1 text-xs rounded-lg transition outline-none border-0 cursor-pointer ml-1"
          style={{
            backgroundColor: 'var(--border-app)',
            color: 'var(--text-app-primary)'
          }}
          title="Ctrl + B"
        >
          {explorerOpen ? 'Ẩn Sidebar' : 'Hiện Sidebar'}
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
