import { useEffect, useState, useRef } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useQuery } from '@tanstack/react-query';
import type { Channel } from '@/types';
import { Search, Hash, Volume2, ShieldAlert, Sparkles } from 'lucide-react';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    activeWorkspaceId,
    setActiveChannelId,
    setActiveVoiceChannelId,
  } = useChatStore();

  // Listen to Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch channels for fuzzy search
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    enabled: !!activeWorkspaceId && isOpen,
  });

  // Handle clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter commands and channels
  const getFilteredItems = () => {
    const lowercaseQuery = query.toLowerCase();
    
    // Default commands
    const systemCommands = [
      { id: 'cmd-away', type: 'command', title: '/away', desc: 'Đặt trạng thái của bạn thành tạm vắng' },
      { id: 'cmd-busy', type: 'command', title: '/busy', desc: 'Đặt trạng thái của bạn thành bận' },
      { id: 'cmd-online', type: 'command', title: '/online', desc: 'Đặt trạng thái của bạn thành trực tuyến' },
    ];

    let items: any[] = [];

    if (lowercaseQuery.startsWith('t:')) {
      // Search text channels only
      const searchWord = lowercaseQuery.slice(2);
      items = channels
        .filter((c) => c.type === 'text' && c.name.toLowerCase().includes(searchWord))
        .map((c) => ({ id: c.id, type: 'text-chan', title: c.name, desc: 'Nhảy nhanh đến kênh chữ này', channel: c }));
    } else if (lowercaseQuery.startsWith('v:')) {
      // Search voice channels only
      const searchWord = lowercaseQuery.slice(2);
      items = channels
        .filter((c) => c.type === 'voice' && c.name.toLowerCase().includes(searchWord))
        .map((c) => ({ id: c.id, type: 'voice-chan', title: c.name, desc: 'Kết nối nhanh đến phòng thoại này', channel: c }));
    } else {
      // General search: text channels, voice channels, and matching commands
      const filteredCommands = systemCommands.filter(
        (cmd) => cmd.title.includes(lowercaseQuery) || cmd.desc.toLowerCase().includes(lowercaseQuery)
      );
      
      const filteredChannels = channels
        .filter((c) => c.name.toLowerCase().includes(lowercaseQuery))
        .map((c) => ({
          id: c.id,
          type: c.type === 'text' ? 'text-chan' : 'voice-chan',
          title: c.name,
          desc: c.type === 'text' ? 'Nhảy nhanh đến kênh chữ này' : 'Kết nối nhanh đến phòng thoại này',
          channel: c,
        }));

      items = [...filteredCommands, ...filteredChannels];
    }

    return items.slice(0, 7); // limit to 7 items for cleaner UI
  };

  const filteredItems = getFilteredItems();

  const handleSelectItem = (item: any) => {
    if (item.type === 'text-chan') {
      setActiveChannelId(item.channel.id);
    } else if (item.type === 'voice-chan') {
      setActiveVoiceChannelId(item.channel.id);
      setActiveChannelId(item.channel.id);
    } else if (item.type === 'command') {
      alert(`Đã thực thi lệnh trạng thái: ${item.title}`);
    }
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/65 backdrop-blur-sm z-50 flex items-start justify-center pt-[15vh] px-4 animate-in fade-in duration-200">
      <div 
        ref={containerRef}
        className="w-full max-w-[550px] bg-zinc-900 border border-zinc-800/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-top-4 duration-300"
      >
        {/* Search header */}
        <div className="flex items-center px-4 py-3 bg-zinc-950/40 border-b border-zinc-850">
          <Search className="w-5 h-5 text-zinc-500 mr-3 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Gõ lệnh (/away), tìm kênh (t:[tên] cho kênh chữ, v:[tên] cho kênh thoại)..."
            className="w-full bg-transparent border-0 text-white outline-none placeholder-zinc-500 text-sm py-1"
          />
        </div>

        {/* Suggestion list */}
        <div className="max-h-[300px] overflow-y-auto p-2">
          {filteredItems.map((item) => {
            const isCommand = item.type === 'command';
            const isTextChan = item.type === 'text-chan';
            return (
              <div
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-zinc-800/60 cursor-pointer transition text-left group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-500 shrink-0 group-hover:bg-indigo-600/10 group-hover:text-indigo-400 group-hover:border-indigo-500/20 transition-all">
                    {isCommand ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : isTextChan ? (
                      <Hash className="w-4 h-4" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-zinc-200 text-xs truncate block group-hover:text-white">{item.title}</span>
                    <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{item.desc}</span>
                  </div>
                </div>
                <div className="text-[9px] font-semibold text-zinc-600 bg-zinc-950/60 border border-zinc-850 px-2 py-0.5 rounded-md group-hover:text-indigo-400 group-hover:border-indigo-500/20 duration-150">
                  Select
                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-500 select-none">
              <Sparkles className="w-6 h-6 text-zinc-700 mb-2" />
              <p className="text-xs">Không tìm thấy kết quả phù hợp</p>
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-zinc-950/60 border-t border-zinc-850 flex justify-between items-center text-[10px] text-zinc-500 font-medium">
          <div className="flex items-center gap-2">
            <span>Dùng <kbd className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded shadow">↑↓</kbd> để di chuyển</span>
            <span><kbd className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded shadow">Enter</kbd> để chọn</span>
          </div>
          <div>
            <span>Nhấn <kbd className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded shadow">ESC</kbd> để đóng</span>
          </div>
        </div>
      </div>
    </div>
  );
}
