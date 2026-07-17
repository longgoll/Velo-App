import { useEffect, useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Plus, Compass, Hash, Volume2, ChevronDown, ChevronRight, Folder, FolderOpen, Search, Users, Sparkles, MessageSquare, PlusCircle, Globe, Bell, Settings, Copy, Link, Check, Share2, PhoneCall, Mic, MicOff, Headphones, PhoneOff } from 'lucide-react';
import api from '@/lib/api';
import { useVoiceCall } from '@/context/VoiceCallContext';
import type { Channel, Workspace, DMChannel, WorkspaceMember } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import WorkspaceSettingsModal from '@/features/workspace/components/WorkspaceSettingsModal';
import ChannelSettingsModal from '@/features/workspace/components/ChannelSettingsModal';

// Mock data for Communities
const MOCK_COMMUNITIES = [
  { id: 'comm-1', name: 'Vietnam Developers Group', members: '12.4k members', desc: 'Cộng đồng lập trình viên Việt Nam.' },
  { id: 'comm-2', name: 'Design Hub Showcase', members: '8.2k members', desc: 'Nơi chia sẻ các thiết kế UI/UX.' },
  { id: 'comm-3', name: 'Open Source Pioneers', members: '3.1k members', desc: 'Đóng góp dự án mã nguồn mở.' },
];
interface VoiceChannelItemProps {
  chan: Channel;
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeVoiceChannelId: string | null;
  handleChannelClick: (chan: Channel) => void;
  isOwnerOrAdmin: boolean;
  onOpenSettings: (chan: Channel) => void;
}

function VoiceChannelItem({
  chan,
  activeWorkspaceId,
  activeChannelId,
  activeVoiceChannelId,
  handleChannelClick,
  isOwnerOrAdmin,
  onOpenSettings,
}: VoiceChannelItemProps) {
  const isUserInThisVoice = activeVoiceChannelId === chan.id;

  // Query active call participants from Go Core API
  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ['call-participants', chan.id],
    queryFn: async () => {
      if (!chan.id || !activeWorkspaceId) return [];
      try {
        const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${chan.id}/participants`);
        return res.data;
      } catch (e) {
        return [];
      }
    },
    enabled: !!chan.id && !!activeWorkspaceId,
    refetchInterval: 3000, // Poll every 3 seconds to keep sidebar participants in sync
  });

  return (
    <div className="flex flex-col gap-0.5 group relative animate-in fade-in duration-255">
      <button
        onClick={() => handleChannelClick(chan)}
        className={`w-full flex items-center justify-between pl-2 pr-8 py-1.5 rounded-lg text-xs font-medium transition outline-none ${
          activeChannelId === chan.id
            ? 'bg-zinc-800/80 text-white'
            : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <Volume2 className={`w-3.5 h-3.5 ${isUserInThisVoice || participants.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
          <span className={`truncate ${isUserInThisVoice ? 'text-emerald-400 font-semibold' : ''}`}>
            {chan.name}
          </span>
        </div>
        {isUserInThisVoice ? (
          <span className="flex h-2 w-2 relative mr-1">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        ) : participants.length > 0 ? (
          <span className="text-[9px] text-emerald-400 font-mono flex items-center gap-1 animate-pulse font-bold bg-emerald-950/40 border border-emerald-500/10 px-1 rounded mr-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            {participants.length}
          </span>
        ) : null}
      </button>

      {isOwnerOrAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings(chan);
          }}
          className="absolute right-1.5 top-[7px] p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer z-10"
          title="Cài đặt kênh"
        >
          <Settings className="w-3 h-3" />
        </button>
      )}

      {/* Render active participants list under channel name */}
      {participants.length > 0 && (
        <div className="pl-6 pr-2 py-0.5 flex flex-col gap-1 select-none animate-in fade-in slide-in-from-top-1 duration-150">
          {participants.map((p) => {
            const initials = p.name ? p.name.substring(0, 2).toUpperCase() : 'U';
            return (
              <div key={p.identity} className="flex items-center gap-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300">
                <Avatar className="w-4 h-4 border border-zinc-950 shrink-0">
                  <AvatarFallback className={`text-[6px] font-extrabold ${getAvatarGradient(p.name || '')}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[140px] font-medium leading-none">{p.name || 'Người dùng'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface TextChannelItemProps {
  chan: Channel;
  activeChannelId: string | null;
  unreadChannels: Record<string, number>;
  handleChannelClick: (chan: Channel) => void;
  isOwnerOrAdmin: boolean;
  onOpenSettings: (chan: Channel) => void;
}

function TextChannelItem({
  chan,
  activeChannelId,
  unreadChannels,
  handleChannelClick,
  isOwnerOrAdmin,
  onOpenSettings,
}: TextChannelItemProps) {
  return (
    <div className="flex flex-col gap-0.5 animate-in fade-in duration-255 group relative">
      <button
        onClick={() => handleChannelClick(chan)}
        className={`w-full flex items-center justify-between pl-2 pr-8 py-1.5 rounded-lg text-xs font-medium transition outline-none ${
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
          <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full shrink-0 mr-1">
            {unreadChannels[chan.id]}
          </span>
        )}
      </button>

      {isOwnerOrAdmin && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenSettings(chan);
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
          title="Cài đặt kênh"
        >
          <Settings className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

interface DmChannelItemProps {
  dm: any;
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeVoiceChannelId: string | null;
  handleChannelClick: (id: string) => void;
}

function DmChannelItem({
  dm,
  activeWorkspaceId,
  activeChannelId,
  activeVoiceChannelId,
  handleChannelClick,
}: DmChannelItemProps) {
  const isUserInThisVoice = activeVoiceChannelId === dm.id;
  const isActive = activeChannelId === dm.id;

  // Query active call participants from Go Core API
  const { data: participants = [] } = useQuery<any[]>({
    queryKey: ['call-participants', dm.id],
    queryFn: async () => {
      if (!dm.id || !activeWorkspaceId) return [];
      try {
        const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${dm.id}/participants`);
        return res.data;
      } catch (e) {
        return [];
      }
    },
    enabled: !!dm.id && !!activeWorkspaceId,
    refetchInterval: 3000,
  });

  return (
    <div className="flex flex-col gap-0.5 animate-in fade-in duration-255">
      <button
        onClick={() => handleChannelClick(dm.id)}
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-medium transition outline-none ${
          isActive
            ? 'bg-zinc-800/80 text-white shadow-sm'
            : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
        }`}
      >
        <div className="relative shrink-0">
          <Avatar size="sm" className={`shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-all ${dm.status === 'online' ? 'ring-1 ring-emerald-500/20' : ''}`}>
            <AvatarFallback className={`text-[10px] font-semibold ${getAvatarGradient(dm.username)}`}>
              {dm.username.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${dm.statusColor} shadow-sm`} />
        </div>
        <div className="truncate text-left flex-1 min-w-0">
          <div className={`truncate font-semibold text-zinc-200 ${isUserInThisVoice ? 'text-emerald-400' : ''}`}>{dm.username}</div>
          <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5 capitalize flex items-center gap-1">
            {participants.length > 0 ? (
              <span className="text-emerald-400 font-semibold animate-pulse flex items-center gap-1">
                <PhoneCall className="w-2.5 h-2.5" /> Đang cuộc gọi
              </span>
            ) : (
              dm.statusText || dm.status
            )}
          </div>
        </div>
        {participants.length > 0 && !isUserInThisVoice && (
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        )}
      </button>

      {/* Render active participants list under DM channel if call is active */}
      {participants.length > 0 && (
        <div className="pl-12 pr-2 py-0.5 flex flex-col gap-1 select-none animate-in fade-in slide-in-from-top-1 duration-150">
          {participants.map((p) => {
            const initials = p.name ? p.name.substring(0, 2).toUpperCase() : 'U';
            return (
              <div key={p.identity} className="flex items-center gap-1.5 py-0.5 text-[10px] text-zinc-500 hover:text-zinc-300">
                <Avatar className="w-4 h-4 border border-zinc-950 shrink-0">
                  <AvatarFallback className={`text-[6px] font-extrabold ${getAvatarGradient(p.name || '')}`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[120px] font-medium leading-none">{p.name || 'Người dùng'}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ContentExplorer() {
  const {
    activeWorkspaceId,
    activeChannelId,
    explorerOpen,
    activeFilter,
    unreadChannels,
    activeVoiceChannelId,
    recentConversations,
    setActiveWorkspaceId,
    setActiveChannelId,
    toggleExplorer,
    setActiveVoiceChannelId,
    setShowCreateWs,
    setShowJoinWs,
    setShowCreateChan,
    setActiveFilter,
    voiceMuted,
    voiceDeafened,
    setVoiceMuted,
    setVoiceDeafened,
  } = useChatStore();

  const { disconnectCall } = useVoiceCall();

  const [textFolderOpen, setTextFolderOpen] = useState(true);
  const [voiceFolderOpen, setVoiceFolderOpen] = useState(true);
  const [dmSearch, setDmSearch] = useState('');
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null);

  const handleOpenChannelSettings = (chan: Channel) => {
    setSettingsChannel(chan);
  };

  const handleCopyId = () => {
    if (!activeWorkspaceId) return;
    navigator.clipboard.writeText(activeWorkspaceId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    if (!activeWs?.invite_code) return;
    const inviteLink = `${window.location.origin}?invite=${activeWs.invite_code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!activeWs?.invite_code) return;
    navigator.clipboard.writeText(activeWs.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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

  // Fetch channels for all workspaces
  const allWorkspaceChannelsQueries = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ['channels', ws.id],
      queryFn: async () => {
        const res = await api.get(`/workspaces/${ws.id}/channels`);
        return res.data as Channel[];
      },
      enabled: workspaces.length > 0,
    })),
  });

  // Fetch DMs for all workspaces
  const allWorkspaceDmsQueries = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ['dms', ws.id],
      queryFn: async () => {
        const res = await api.get(`/workspaces/${ws.id}/dms`);
        return res.data as DMChannel[];
      },
      enabled: workspaces.length > 0,
    })),
  });

  const allExplorerChannels = allWorkspaceChannelsQueries.flatMap((q) => q.data || []);
  const allExplorerDms = allWorkspaceDmsQueries.flatMap((q) => q.data || []);

  const explorerWorkspaceMap = workspaces.reduce((acc, ws) => {
    acc[ws.id] = ws.name;
    return acc;
  }, {} as Record<string, string>);

  const getExplorerChannelInfo = (id: string) => {
    const channel = allExplorerChannels.find((c) => c.id === id);
    if (channel) {
      return {
        id: channel.id,
        name: channel.name,
        type: channel.type,
        workspaceId: channel.workspace_id,
        workspaceName: explorerWorkspaceMap[channel.workspace_id] || 'Workspace',
        isDm: false,
      };
    }
    const dm = allExplorerDms.find((d) => d.id === id);
    if (dm) {
      const currentUserStr = localStorage.getItem('user');
      const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
      const otherUser = dm.user_one_id === currentUser?.id ? dm.user_two : dm.user_one;
      return {
        id: dm.id,
        name: otherUser?.username || 'Trò chuyện',
        type: 'text' as const,
        workspaceId: dm.workspace_id,
        workspaceName: explorerWorkspaceMap[dm.workspace_id] || 'Workspace',
        isDm: true,
      };
    }
    return null;
  };

  const getWorkspaceUnreadCount = (wsId: string) => {
    const wsChannels = allExplorerChannels.filter((c) => c.workspace_id === wsId).map((c) => c.id);
    const wsDms = allExplorerDms.filter((d) => d.workspace_id === wsId).map((d) => d.id);
    const wsIds = [...wsChannels, ...wsDms];
    return wsIds.reduce((sum, id) => sum + (unreadChannels[id] || 0), 0);
  };

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
    enabled: !!activeWorkspaceId,
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

  const myMemberRecord = members.find((m) => m.user_id === currentUser?.id);
  const myRole = myMemberRecord?.role || 'member';
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

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

  const navigateToConversation = (id: string, isDm: boolean, workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveFilter(isDm ? 'dms' : 'workspaces');
    setActiveChannelId(id, isDm ? 'dm' : 'channel', workspaceId);
  };

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

  // Find name of active voice channel
  const activeVoiceChannel = allExplorerChannels.find(c => c.id === activeVoiceChannelId);
  let voiceChannelName = activeVoiceChannel ? activeVoiceChannel.name : 'Cuộc gọi';
  
  if (!activeVoiceChannel) {
    const activeVoiceDm = allExplorerDms.find(d => d.id === activeVoiceChannelId);
    if (activeVoiceDm) {
      const otherUser = activeVoiceDm.user_one_id === currentUser?.id ? activeVoiceDm.user_two : activeVoiceDm.user_one;
      voiceChannelName = otherUser?.username || 'Trò chuyện';
    }
  }

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
                      className={`w-full text-left px-2 py-1.5 rounded-lg text-xs font-medium transition flex items-center justify-between cursor-pointer border-0 outline-none ${
                        activeWorkspaceId === ws.id
                          ? 'bg-indigo-600 text-white'
                          : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <span>{ws.name}</span>
                      {(() => {
                        const count = getWorkspaceUnreadCount(ws.id);
                        return count > 0 ? (
                          <span className={`flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[8px] font-bold rounded-full ${
                            activeWorkspaceId === ws.id ? 'bg-white text-indigo-600' : 'bg-rose-500 text-white'
                          }`}>
                            {count}
                          </span>
                        ) : null;
                      })()}
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
                  {activeWorkspaceId && (
                    <>
                      <div className="border-t border-zinc-800/60 my-1.5" />
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setWsDropdownOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition flex items-center gap-2 cursor-pointer outline-none border-0"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        Cài đặt không gian
                      </button>
                    </>
                  )}
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
                      {isOwnerOrAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreateChan(true);
                          }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white rounded transition outline-none cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {textFolderOpen && (
                      <div className="space-y-1.5 pl-3">
                        {textChannels.map((chan) => (
                          <TextChannelItem
                            key={chan.id}
                            chan={chan}
                            activeChannelId={activeChannelId}
                            unreadChannels={unreadChannels}
                            handleChannelClick={handleChannelClick}
                            isOwnerOrAdmin={isOwnerOrAdmin}
                            onOpenSettings={handleOpenChannelSettings}
                          />
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
                      {isOwnerOrAdmin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowCreateChan(true);
                          }}
                          className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 hover:text-white rounded transition outline-none cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {voiceFolderOpen && (
                      <div className="space-y-1.5 pl-3">
                        {voiceChannels.map((chan) => (
                          <VoiceChannelItem
                            key={chan.id}
                            chan={chan}
                            activeWorkspaceId={activeWorkspaceId}
                            activeChannelId={activeChannelId}
                            activeVoiceChannelId={activeVoiceChannelId}
                            handleChannelClick={handleChannelClick}
                            isOwnerOrAdmin={isOwnerOrAdmin}
                            onOpenSettings={handleOpenChannelSettings}
                          />
                        ))}
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
                  activeDmsList.map((dm) => (
                    <DmChannelItem
                      key={dm.id}
                      dm={dm}
                      activeWorkspaceId={activeWorkspaceId}
                      activeChannelId={activeChannelId}
                      activeVoiceChannelId={activeVoiceChannelId}
                      handleChannelClick={(id) => setActiveChannelId(id, 'dm', activeWorkspaceId)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* ================== ALL MESSAGES ACTIVITIES VIEW ================== */}
        {activeFilter === 'all' && (() => {
          const unreadChannelIds = Object.keys(unreadChannels).filter((id) => unreadChannels[id] > 0);
          
          const explorerUnreadList = unreadChannelIds
            .map((id) => getExplorerChannelInfo(id))
            .filter((item) => item !== null);

          const explorerRecentList = recentConversations
            .map((c) => getExplorerChannelInfo(c.id))
            .filter((item) => item !== null);

          return (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 h-[52px] border-b border-zinc-950/60 flex items-center justify-between">
                <span className="font-bold text-white text-sm">Hộp thư chung</span>
                <MessageSquare className="w-4 h-4 text-zinc-500" />
              </div>

              <ScrollArea className="flex-1 px-2 py-3">
                <div className="space-y-4">
                  {/* Dashboard link */}
                  <div>
                    <button
                      onClick={() => setActiveChannelId(null)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold transition outline-none border-0 text-left cursor-pointer ${
                        activeChannelId === null
                          ? 'bg-zinc-800 text-white shadow-sm'
                          : 'text-indigo-400 hover:bg-zinc-800/30'
                      }`}
                    >
                      <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                      <span>Xem Bảng Hoạt động</span>
                    </button>
                  </div>

                  {/* Group 1: CHƯA ĐỌC */}
                  {explorerUnreadList.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        <Bell className="w-3.5 h-3.5 text-rose-450 shrink-0" />
                        <span>Chưa đọc</span>
                      </div>
                      <div className="space-y-0.5">
                        {explorerUnreadList.map((item) => {
                          if (!item) return null;
                          const Icon = item.isDm ? Users : (item.type === 'voice' ? Volume2 : Hash);
                          const unreadCount = unreadChannels[item.id] || 0;
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigateToConversation(item.id, item.isDm, item.workspaceId)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition outline-none border-0 text-left cursor-pointer ${
                                activeChannelId === item.id
                                  ? 'bg-zinc-800 text-white shadow-sm'
                                  : 'text-zinc-300 hover:bg-zinc-800/20'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <div className="truncate">
                                  <span className="font-semibold text-zinc-200 block truncate leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-zinc-500 block truncate">
                                    {item.workspaceName}
                                  </span>
                                </div>
                              </div>
                              <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full shrink-0">
                                {unreadCount}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Group 2: HOẠT ĐỘNG GẦN ĐÂY */}
                  <div>
                    <div className="flex items-center gap-1.5 px-2 py-1 mb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      <MessageSquare className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>Gần đây</span>
                    </div>
                    <div className="space-y-0.5">
                      {explorerRecentList.length > 0 ? (
                        explorerRecentList.map((item) => {
                          if (!item) return null;
                          const Icon = item.isDm ? Users : (item.type === 'voice' ? Volume2 : Hash);
                          return (
                            <button
                              key={item.id}
                              onClick={() => navigateToConversation(item.id, item.isDm, item.workspaceId)}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition outline-none border-0 text-left cursor-pointer ${
                                activeChannelId === item.id
                                  ? 'bg-zinc-800 text-white shadow-sm'
                                  : 'text-zinc-400 hover:bg-zinc-800/20 hover:text-zinc-200'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                <div className="truncate">
                                  <span className="font-medium text-zinc-300 block truncate leading-tight">
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-zinc-550 block truncate">
                                    {item.workspaceName}
                                  </span>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[10px] text-zinc-650 italic px-2 py-1">Chưa có hoạt động nào</p>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          );
        })()}

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

      {/* Discord-like Voice Connection State Panel */}
      {activeVoiceChannelId && (
        <div className="px-3 py-2 bg-zinc-950/80 border-t border-zinc-900/60 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.2)] select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0 border border-emerald-500/10">
              <Volume2 className="w-4 h-4 animate-pulse" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-[10px] font-bold text-emerald-400 leading-tight">Đã kết nối thoại</div>
              <div className="text-[9px] text-zinc-500 font-semibold truncate mt-0.5" title={voiceChannelName}>
                {voiceChannelName}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setVoiceMuted(!voiceMuted)}
              className={`p-1.5 rounded hover:bg-zinc-800 transition-colors border-0 outline-none cursor-pointer ${
                voiceMuted ? 'text-rose-500' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title={voiceMuted ? 'Bật âm thanh micro' : 'Tắt tiếng micro'}
            >
              {voiceMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setVoiceDeafened(!voiceDeafened)}
              className={`p-1.5 rounded hover:bg-zinc-800 transition-colors border-0 outline-none cursor-pointer ${
                voiceDeafened ? 'text-rose-500' : 'text-zinc-450 hover:text-zinc-200'
              }`}
              title={voiceDeafened ? 'Bật âm thanh cuộc gọi' : 'Tắt âm thanh cuộc gọi'}
            >
              {voiceDeafened ? <Volume2 className="w-3.5 h-3.5 text-rose-500" /> : <Headphones className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={disconnectCall}
              className="p-1.5 rounded hover:bg-rose-950/30 text-rose-500 hover:text-rose-400 transition-colors border-0 outline-none cursor-pointer"
              title="Ngắt kết nối"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Share / Active Workspace ID */}
      {activeWorkspaceId && activeFilter === 'workspaces' && (
        <div className="px-4 py-2.5 bg-zinc-950/20 border-t border-zinc-950/60 flex items-center justify-between text-xs text-zinc-455">
          <div className="flex items-center gap-1.5 min-w-0">
            <Share2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold text-zinc-300 truncate" title={activeWs?.name}>
              {activeWs?.name || 'Không gian'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {activeWs?.invite_code ? (
              <>
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-1.5 py-1 hover:bg-zinc-800/80 hover:text-zinc-200 rounded text-[10px] text-zinc-400 transition-colors border-0 cursor-pointer outline-none bg-transparent font-mono font-medium"
                  title="Sao chép Mã mời"
                >
                  {copiedCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  <span>{activeWs.invite_code}</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="p-1 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors border-0 cursor-pointer outline-none bg-transparent rounded"
                  title="Sao chép Link mời"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-500" /> : <Link className="w-3 h-3" />}
                </button>
              </>
            ) : null}

            {activeWorkspaceId !== activeWs?.invite_code && (
              <button
                onClick={handleCopyId}
                className="p-1 hover:bg-zinc-800/80 text-zinc-400 hover:text-zinc-200 transition-colors border-0 cursor-pointer outline-none bg-transparent rounded"
                title="Sao chép ID không gian"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              </button>
            )}
          </div>
        </div>
      )}

      {activeWorkspaceId && (
        <WorkspaceSettingsModal
          open={showSettings}
          onOpenChange={setShowSettings}
          workspaceId={activeWorkspaceId}
        />
      )}

      {settingsChannel && activeWorkspaceId && (
        <ChannelSettingsModal
          open={settingsChannel !== null}
          onOpenChange={(open) => {
            if (!open) setSettingsChannel(null);
          }}
          channel={settingsChannel}
          workspaceId={activeWorkspaceId}
        />
      )}
    </div>
  );
}

