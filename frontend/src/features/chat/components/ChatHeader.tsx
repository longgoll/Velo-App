import { Hash, PhoneCall, Video, Search, Bell, Pin, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

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
        <div
          onClick={() => {
            closeOtherPanels('search');
            setShowSearch(true);
          }}
          className={`flex items-center justify-between gap-2 border transition-all duration-200 rounded-lg px-2.5 py-1 w-36 sm:w-44 md:w-52 cursor-pointer select-none ${
            showSearch ? 'border-indigo-500/50 ring-1 ring-indigo-500/10' : ''
          }`}
          style={{
            backgroundColor: 'var(--border-app)',
            borderColor: showSearch ? undefined : 'transparent',
          }}
        >
          <span 
            className="text-[10px] truncate font-medium"
            style={{ color: 'var(--text-app-secondary)' }}
          >
            Tìm kiếm {workspaceName || 'Tool-VLXD'}
          </span>
          <Search 
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: 'var(--text-app-secondary)' }}
          />
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
