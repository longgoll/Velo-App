import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Plus, Compass, Hash, Volume2, ChevronDown, ChevronRight, Folder, FolderOpen, Search, Users, Sparkles, MessageSquare, PlusCircle, Globe } from 'lucide-react';
import api from '@/lib/api';
import type { Channel, Workspace, DMChannel, WorkspaceMember } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

// Mock data for Communities
const MOCK_COMMUNITIES = [
  { id: 'comm-1', name: 'Vietnam Developers Group', members: '12.4k members', desc: 'Cộng đồng lập trình viên Việt Nam.' },
  { id: 'comm-2', name: 'Design Hub Showcase', members: '8.2k members', desc: 'Nơi chia sẻ các thiết kế UI/UX.' },
  { id: 'comm-3', name: 'Open Source Pioneers', members: '3.1k members', desc: 'Đóng góp dự án mã nguồn mở.' },
];

export default function ContentExplorer() {
  const {
    activeWorkspaceId,
    activeChannelId,
    explorerOpen,
    activeFilter,
    unreadChannels,
    activeVoiceChannelId,
    setActiveWorkspaceId,
    setActiveChannelId,
    toggleExplorer,
    setActiveVoiceChannelId,
    setShowCreateWs,
    setShowJoinWs,
    setShowCreateChan,
  } = useChatStore();

  const [textFolderOpen, setTextFolderOpen] = useState(true);
  const [voiceFolderOpen, setVoiceFolderOpen] = useState(true);
  const [dmSearch, setDmSearch] = useState('');
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle explorer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        toggleExplorer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleExplorer]);

  // Fetch workspaces (cached)
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  // Fetch channels for active workspace
  const { data: channels = [], isLoading: isChannelsLoading } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && activeFilter === 'workspaces',
  });

  // Fetch workspace members to initiate DM
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && activeFilter === 'dms',
  });

  // Fetch active DM channels
  const { data: dmChannels = [], refetch: refetchDms } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && activeFilter === 'dms',
  });

  // Current logged in user info
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const handleMemberClick = async (recipientId: string) => {
    try {
      const res = await api.post(`/workspaces/${activeWorkspaceId}/dms`, {
        recipient_id: recipientId,
      });
      const newDmChannel = res.data as DMChannel;
      await refetchDms();
      setActiveChannelId(newDmChannel.id);
      setDmSearch('');
    } catch (err) {
      console.error('Failed to start DM channel:', err);
    }
  };

  const getStatus = (username: string) => {
    const code = username.charCodeAt(0) % 3;
    if (code === 0) return { status: 'online', statusColor: 'bg-emerald-500', glowColor: 'shadow-emerald-500/30' };
    if (code === 1) return { status: 'idle', statusColor: 'bg-amber-500', glowColor: 'shadow-amber-500/30' };
    return { status: 'offline', statusColor: 'bg-zinc-500', glowColor: 'shadow-zinc-500/10' };
  };

  const filteredMembers = members.filter((m) => {
    if (!m.user) return false;
    if (m.user.id === currentUser?.id) return false;
    return m.user.username.toLowerCase().includes(dmSearch.toLowerCase());
  });

  const activeDmsList = dmChannels.map((dm) => {
    const otherUser = dm.user_one_id === currentUser?.id ? dm.user_two : dm.user_one;
    const username = otherUser?.username || 'Trò chuyện';
    const statusDetails = getStatus(username);
    return {
      id: dm.id,
      username,
      ...statusDetails,
    };
  });

  // Auto-select first workspace if none is active or active is invalid
  useEffect(() => {
    if (workspaces.length > 0) {
      const isValid = workspaces.some((w) => w.id === activeWorkspaceId);
      if (!isValid) {
        setActiveWorkspaceId(workspaces[0].id);
      }
    } else if (activeWorkspaceId !== null) {
      setActiveWorkspaceId(null);
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  // Auto-select first text channel of the active workspace if none is active or active is invalid
  useEffect(() => {
    if (activeWorkspaceId && channels.length > 0) {
      // If we are in DMs filter view, or the active channel is a DM, do not reset it to a standard workspace channel
      const isDm = activeFilter === 'dms' || 
                   (dmChannels && dmChannels.some((d) => d.id === activeChannelId));
      if (isDm) {
        return;
      }

      const isValid = channels.some((c) => c.id === activeChannelId);
      if (!isValid) {
        const firstText = channels.find((c) => c.type === 'text');
        if (firstText) {
          setActiveChannelId(firstText.id);
        } else {
          setActiveChannelId(channels[0].id);
        }
      }
    } else if (!activeWorkspaceId && activeChannelId !== null) {
      setActiveChannelId(null);
    }
  }, [channels, activeWorkspaceId, activeChannelId, setActiveChannelId, activeFilter, dmChannels]);

  if (!explorerOpen) return null;

  const handleChannelClick = (chan: Channel) => {
    if (chan.type === 'voice') {
      // Single-click join voice channel instantly
      setActiveVoiceChannelId(chan.id);
      setActiveChannelId(chan.id);
    } else {
      setActiveChannelId(chan.id);
    }
  };

  const textChannels = channels.filter((c) => c.type === 'text');
  const voiceChannels = channels.filter((c) => c.type === 'voice');

  return (
    <div className="w-[240px] bg-zinc-900/90 backdrop-blur-md flex flex-col justify-between border-r border-zinc-950/60 h-full select-none shrink-0 transition-all duration-300">
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* ================== WORKSPACES FILTER VIEW ================== */}
        {activeFilter === 'workspaces' && (
          <>
            {/* Workspace Selector Dropdown Header */}
            <div className="relative">
              <div 
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="px-4 py-3 h-[52px] border-b border-zinc-950/60 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 active:bg-zinc-800/40 transition-colors"
              >
                <h1 className="font-bold text-white truncate text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  {activeWs?.name || 'Chọn không gian'}
                </h1>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${wsDropdownOpen ? 'rotate-180' : ''}`} />
              </div>

              {wsDropdownOpen && (
                <div className="absolute top-[52px] left-2 right-2 mt-1 bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-2xl z-30 max-h-[300px] overflow-y-auto p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="text-[10px] font-semibold text-zinc-500 px-2 py-1 uppercase">Các không gian của bạn</div>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setActiveWorkspaceId(ws.id);
                        setWsDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                        activeWorkspaceId === ws.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      {ws.name}
                    </button>
                  ))}
                  <div className="border-t border-zinc-800/60 my-1.5" />
                  <button
                    onClick={() => {
                      setShowCreateWs(true);
                      setWsDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-indigo-400 hover:bg-zinc-900 hover:text-indigo-300 transition flex items-center gap-2 cursor-pointer outline-none border-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Tạo không gian mới
                  </button>
                  <button
                    onClick={() => {
                      setShowJoinWs(true);
                      setWsDropdownOpen(false);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition flex items-center gap-2 cursor-pointer outline-none border-0"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    Tham gia không gian
                  </button>
                  {workspaces.length === 0 && (
                    <div className="text-zinc-600 text-xs px-2 py-2 italic text-center">Chưa có không gian nào</div>
                  )}
                </div>
              )}
            </div>

            {/* Folder-Tree Channels Structure */}
            {activeWorkspaceId ? (
              <ScrollArea className="flex-1 px-2 py-3">
                <div className="space-y-4">
                  {/* Folder 1: Text Channels */}
                  <div>
                    <div 
                      onClick={() => setTextFolderOpen(!textFolderOpen)}
                      className="flex items-center justify-between px-2 py-1 mb-1 text-zinc-500 hover:text-zinc-300 cursor-pointer rounded transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        {textFolderOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {textFolderOpen ? <FolderOpen className="w-3.5 h-3.5 text-indigo-400" /> : <Folder className="w-3.5 h-3.5 text-indigo-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">Kênh chữ</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateChan(true);
                        }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white rounded transition outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {textFolderOpen && (
                      <div className="space-y-0.5 pl-3">
                        {textChannels.map((chan) => (
                          <button
                            key={chan.id}
                            onClick={() => handleChannelClick(chan)}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition outline-none ${
                              activeChannelId === chan.id
                                ? 'bg-zinc-800/80 text-white shadow-sm'
                                : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <Hash className="w-3.5 h-3.5 text-zinc-500" />
                              <span className={`truncate ${unreadChannels[chan.id] > 0 ? 'font-bold text-white' : ''}`}>
                                {chan.name}
                              </span>
                            </div>
                            {unreadChannels[chan.id] > 0 && (
                              <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full">
                                {unreadChannels[chan.id]}
                              </span>
                            )}
                          </button>
                        ))}
                        {textChannels.length === 0 && !isChannelsLoading && (
                          <p className="text-[11px] text-zinc-600 italic pl-5 py-1">Chưa có kênh chữ</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Folder 2: Voice Channels */}
                  <div>
                    <div 
                      onClick={() => setVoiceFolderOpen(!voiceFolderOpen)}
                      className="flex items-center justify-between px-2 py-1 mb-1 text-zinc-500 hover:text-zinc-300 cursor-pointer rounded transition group"
                    >
                      <div className="flex items-center gap-1.5">
                        {voiceFolderOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        {voiceFolderOpen ? <FolderOpen className="w-3.5 h-3.5 text-emerald-400" /> : <Folder className="w-3.5 h-3.5 text-emerald-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-wider">Kênh thoại</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCreateChan(true);
                        }}
                        className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white rounded transition outline-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {voiceFolderOpen && (
                      <div className="space-y-0.5 pl-3">
                        {voiceChannels.map((chan) => {
                          const isUserInThisVoice = activeVoiceChannelId === chan.id;
                          return (
                            <button
                              key={chan.id}
                              onClick={() => handleChannelClick(chan)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition outline-none ${
                                activeChannelId === chan.id
                                  ? 'bg-zinc-800/80 text-white'
                                  : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                <Volume2 className={`w-3.5 h-3.5 ${isUserInThisVoice ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
                                <span className={`truncate ${isUserInThisVoice ? 'text-emerald-400 font-semibold' : ''}`}>
                                  {chan.name}
                                </span>
                              </div>
                              {isUserInThisVoice ? (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              ) : (
                                <span className="text-[9px] text-zinc-600 font-mono">🔊 Trực tuyến</span>
                              )}
                            </button>
                          );
                        })}
                        {voiceChannels.length === 0 && !isChannelsLoading && (
                          <p className="text-[11px] text-zinc-600 italic pl-5 py-1">Chưa có kênh thoại</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                <Sparkles className="w-8 h-8 text-zinc-700 mb-2" />
                <p className="text-xs text-zinc-500">Chọn hoặc tạo mới một không gian làm việc ở menu thả xuống phía trên.</p>
              </div>
            )}
          </>
        )}

        {/* ================== DIRECT MESSAGES (DMs) VIEW ================== */}
        {activeFilter === 'dms' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 h-[52px] border-b border-zinc-950/60 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Tin nhắn trực tiếp</span>
              <Users className="w-4 h-4 text-zinc-500" />
            </div>

            {/* Search DM input */}
            <div className="p-2 border-b border-zinc-950/20">
              <div className="relative flex items-center bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
                <Search className="w-3.5 h-3.5 text-zinc-500 mr-1.5 shrink-0" />
                <input
                  type="text"
                  value={dmSearch}
                  onChange={(e) => setDmSearch(e.target.value)}
                  placeholder="Tìm kiếm bạn bè..."
                  className="bg-transparent border-0 text-white outline-none w-full placeholder-zinc-600 py-0.5 text-xs"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 px-2 py-2">
              <div className="space-y-0.5">
                {dmSearch ? (
                  /* Searching users in workspace to DM */
                  <>
                    <div className="text-[10px] font-bold text-zinc-500 px-2 py-1 uppercase tracking-wider">Thành viên Workspace</div>
                    {filteredMembers.map((m) => {
                      if (!m.user) return null;
                      const statusDetails = getStatus(m.user.username);
                      return (
                        <button
                          key={m.user.id}
                          onClick={() => handleMemberClick(m.user!.id)}
                          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-medium transition text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200 outline-none"
                        >
                          <Avatar size="sm">
                            <AvatarFallback className={`text-[10px] font-semibold ${getAvatarGradient(m.user.username)}`}>
                              {m.user.username.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="truncate text-left flex-1">
                            <div className="truncate font-semibold text-zinc-200">{m.user.username}</div>
                            <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5 capitalize">{statusDetails.status}</div>
                          </div>
                        </button>
                      );
                    })}
                    {filteredMembers.length === 0 && (
                      <div className="text-zinc-500 text-xs px-2 py-2 italic text-center">Không tìm thấy thành viên nào</div>
                    )}
                  </>
                ) : (
                  /* Active DMs list */
                  activeDmsList.map((dm) => {
                    const isActive = activeChannelId === dm.id;
                    return (
                      <button
                        key={dm.id}
                        onClick={() => setActiveChannelId(dm.id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-medium transition outline-none ${
                          isActive
                            ? 'bg-zinc-800/80 text-white shadow-sm'
                            : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
                        }`}
                      >
                        <div className="relative">
                          <Avatar size="sm" className={`shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-all ${dm.status === 'online' ? 'ring-1 ring-emerald-500/20' : ''}`}>
                            <AvatarFallback className={`text-[10px] font-semibold ${getAvatarGradient(dm.username)}`}>
                              {dm.username.slice(0, 1).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {/* Glow ambient presence indicator */}
                          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${dm.statusColor} shadow-sm`} />
                        </div>
                        <div className="truncate text-left flex-1">
                          <div className="truncate font-semibold text-zinc-200">{dm.username}</div>
                          <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5 capitalize">{dm.status}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ================== ALL MESSAGES ACTIVITIES VIEW ================== */}
        {activeFilter === 'all' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 h-[52px] border-b border-zinc-950/60 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Tất cả hoạt động</span>
              <MessageSquare className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="flex-1 p-4 flex flex-col justify-center items-center text-center text-zinc-500">
              <MessageSquare className="w-10 h-10 text-zinc-800 mb-2" />
              <p className="text-xs">Không có tin nhắn chưa đọc hoặc hoạt động nổi bật nào gần đây.</p>
            </div>
          </div>
        )}

        {/* ================== COMMUNITIES VIEW ================== */}
        {activeFilter === 'communities' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 h-[52px] border-b border-zinc-950/60 flex items-center justify-between">
              <span className="font-bold text-white text-sm">Khám phá cộng đồng</span>
              <Globe className="w-4 h-4 text-zinc-500" />
            </div>

            <ScrollArea className="flex-1 px-3 py-3">
              <div className="space-y-3">
                {MOCK_COMMUNITIES.map((comm) => (
                  <div 
                    key={comm.id}
                    className="p-3 bg-zinc-950/40 hover:bg-zinc-950/80 rounded-xl border border-zinc-850/60 transition group cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-zinc-200 text-xs truncate group-hover:text-indigo-400 transition-colors">
                        {comm.name}
                      </h3>
                      <PlusCircle className="w-3.5 h-3.5 text-zinc-500 hover:text-white" />
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                      {comm.desc}
                    </p>
                    <div className="text-[9px] text-zinc-500 font-medium mt-2 flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-emerald-500" />
                      {comm.members}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

      </div>

      {/* Share / Active Workspace ID */}
      {activeWorkspaceId && activeFilter === 'workspaces' && (
        <div className="p-3 bg-zinc-950/30 m-2 rounded-xl border border-zinc-900/60 text-[10px] transition-all">
          <span className="text-zinc-500 block font-semibold mb-1">ID Không gian:</span>
          <span className="text-zinc-400 font-mono select-text break-all block p-1.5 bg-zinc-950 rounded-lg border border-zinc-900/50">
            {activeWorkspaceId}
          </span>
        </div>
      )}
    </div>
  );
}

