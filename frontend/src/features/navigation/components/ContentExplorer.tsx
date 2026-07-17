import { useEffect, useState, useRef } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Plus, Compass, Hash, Volume2, ChevronDown, ChevronRight, Search, Users, Sparkles, MessageSquare, PlusCircle, Globe, Bell, Settings, Check, PhoneCall, Mic, MicOff, Headphones, PhoneOff, Lock, VolumeX, Video, Monitor, Rocket, Activity, LogOut, UserPlus, Pencil, Copy } from 'lucide-react';
import api from '@/lib/api';
import { useVoiceCall } from '@/context/VoiceCallContext';
import type { Channel, Workspace, DMChannel, WorkspaceMember } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import WorkspaceSettingsModal from '@/features/workspace/components/WorkspaceSettingsModal';
import ChannelSettingsModal from '@/features/workspace/components/ChannelSettingsModal';
import UserSettingsModal from './UserSettingsModal';
import WorkspaceInviteModal from './WorkspaceInviteModal';
import { toast } from '@/store/useToastStore';

import { VoiceChannelItem } from './VoiceChannelItem';
import { TextChannelItem } from './TextChannelItem';
import { DmChannelItem } from './DmChannelItem';
import { useAudioDevices } from '../hooks/useAudioDevices';

// Mock data for Communities
const MOCK_COMMUNITIES = [
  { id: 'comm-1', name: 'Vietnam Developers Group', members: '12.4k members', desc: 'Cộng đồng lập trình viên Việt Nam.' },
  { id: 'comm-2', name: 'Design Hub Showcase', members: '8.2k members', desc: 'Nơi chia sẻ các thiết kế UI/UX.' },
  { id: 'comm-3', name: 'Open Source Pioneers', members: '3.1k members', desc: 'Đóng góp dự án mã nguồn mở.' },
];

interface ContentExplorerProps {
  onLogout?: () => void;
}

export default function ContentExplorer({ onLogout }: ContentExplorerProps) {
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
    presenceUsers,
    sendJsonMessage,
  } = useChatStore();

  const { 
    disconnectCall, 
    toggleCamera, 
    toggleScreenShare, 
    room, 
    isConnected, 
    isConnecting, 
    participants 
  } = useVoiceCall();

  const [textFolderOpen, setTextFolderOpen] = useState(true);
  const [voiceFolderOpen, setVoiceFolderOpen] = useState(true);
  const [dmSearch, setDmSearch] = useState('');
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const myStatus = currentUser ? (presenceUsers[currentUser.username] || localStorage.getItem('user_presence_status') || 'online') : 'online';

  // Handle click outside of popover to close it
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setPopoverOpen(false);
      }
    }
    if (popoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popoverOpen]);

  const handleStatusChange = (status: string) => {
    localStorage.setItem('user_presence_status', status);
    if (currentUser) {
      useChatStore.getState().setUserPresence(currentUser.username, status);
    }
    if (sendJsonMessage) {
      sendJsonMessage({
        type: 'set_status',
        payload: { status }
      });
    }
    setPopoverOpen(false);
    toast.success(`Đã đổi trạng thái thành "${getStatusLabel(status)}"`);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Trực tuyến';
      case 'idle': return 'Vắng mặt';
      case 'dnd': return 'Không làm phiền';
      case 'invisible': return 'Vô hình';
      default: return 'Trực tuyến';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'idle': return 'bg-amber-500';
      case 'dnd': return 'bg-rose-500';
      case 'invisible': return 'bg-zinc-500';
      default: return 'bg-emerald-500';
    }
  };

  const handleCopyUserId = () => {
    if (!currentUser?.id) return;
    navigator.clipboard.writeText(currentUser.id);
    toast.success('Đã sao chép ID người dùng!');
    setPopoverOpen(false);
  };

  // Audio Device Toggles and Settings using custom hook
  const {
    micDropdownOpen,
    setMicDropdownOpen,
    speakerDropdownOpen,
    setSpeakerDropdownOpen,
    audioInputs,
    audioOutputs,
    selectedMicId,
    selectedSpeakerId,
    switchMicrophone,
    switchSpeaker,
  } = useAudioDevices();

  // Find local participant to check camera/screen share states
  const localParticipant = participants.find((p) => p.isLocal);
  const isVideoEnabled = localParticipant?.isVideoEnabled || false;
  const isScreenSharing = localParticipant?.isScreenSharing || false;

  const [settingsChannel, setSettingsChannel] = useState<Channel | null>(null);

  const handleOpenChannelSettings = (chan: Channel) => {
    setSettingsChannel(chan);
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
  const { data: workspacesData } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });
  const workspaces = workspacesData || [];

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
  const { data: channelsData, isLoading: isChannelsLoading } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && activeFilter === 'workspaces',
  });
  const channels = channelsData || [];

  // Fetch workspace members to initiate DM
  const { data: membersData } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });
  const members = membersData || [];

  // Fetch active DM channels
  const { data: dmChannelsData, refetch: refetchDms } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && activeFilter === 'dms',
  });
  const dmChannels = dmChannelsData || [];

  // Current logged in user info

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
    const status = presenceUsers[username] || 'offline';
    if (status === 'online') {
      return { status: 'online', statusColor: 'bg-emerald-500', glowColor: 'shadow-emerald-500/30' };
    }
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
    if (activeFilter === 'all') return; // Do not auto-select when in "All Messages" view

    if (activeWorkspaceId && channels.length > 0) {
      const isValid = channels.some((c) => c.id === activeChannelId) || 
                   (dmChannels && dmChannels.some((d) => d.id === activeChannelId));
      if (!isValid) {
        const firstText = channels.find((c) => c.type === 'text');
        if (firstText) {
          setActiveChannelId(firstText.id, 'channel', activeWorkspaceId);
        } else {
          setActiveChannelId(channels[0].id, 'channel', activeWorkspaceId);
        }
      }
    } else if (!activeWorkspaceId && activeChannelId !== null) {
      setActiveChannelId(null);
    }
  }, [channels, activeWorkspaceId, activeChannelId, setActiveChannelId, activeFilter, dmChannels]);

  // Synchronize unread counts on startup or when the channels/DMs lists are updated
  useEffect(() => {
    if (!currentUser?.id) return;

    // Collect all channel & DM IDs the user has access to
    const channelIds = [
      ...allExplorerChannels.map((c) => c.id),
      ...allExplorerDms.map((d) => d.id),
    ];

    if (channelIds.length === 0) return;

    const syncUnreads = async () => {
      try {
        const res = await api.post('/messages/latest', { channel_ids: channelIds });
        const latestMessages = res.data as Record<string, any>;
        const state = useChatStore.getState();

        Object.entries(latestMessages).forEach(([channelId, msg]) => {
          if (!msg) return;

          const msgTime = new Date(msg.timestamp).getTime();
          const lastReadTime = state.lastRead[channelId] || 0;

          // Check if message is new and not sent by current user
          if (msgTime > lastReadTime && msg.user_id !== currentUser.id) {
            // Check if current count is 0, then initialize/override with 1 to indicate unread
            const currentUnread = state.unreadChannels[channelId] || 0;
            if (currentUnread === 0) {
              state.setUnreadCount(channelId, 1);
            }
          } else {
            // If the latest message is older/equal or sent by the user, clear unread status
            const currentUnread = state.unreadChannels[channelId] || 0;
            if (currentUnread > 0) {
              state.clearUnread(channelId);
            }
          }
        });
      } catch (err) {
        console.error('Failed to sync latest message timestamps:', err);
      }
    };

    syncUnreads();
  }, [allExplorerChannels.length, allExplorerDms.length, currentUser?.id]);

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
      setActiveChannelId(chan.id, 'channel', activeWorkspaceId);
    } else {
      setActiveChannelId(chan.id, 'channel', activeWorkspaceId);
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
    <div className="w-[240px] bg-zinc-900/90 backdrop-blur-md flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-950/60 h-full select-none shrink-0 transition-all duration-300">
      <div className="flex flex-col flex-1 min-h-0">
        
        {/* ================== WORKSPACES FILTER VIEW ================== */}
        {activeFilter === 'workspaces' && (
          <>
            {/* Workspace Selector Dropdown Header */}
            <div className="relative">
              <div 
                onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
                className="px-4 py-3 h-[52px] border-b border-zinc-200 dark:border-zinc-950/60 flex items-center justify-between cursor-pointer hover:bg-zinc-800/20 active:bg-zinc-800/40 transition-colors"
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
                      className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 text-zinc-550 hover:text-zinc-300 dark:hover:text-zinc-200 hover:bg-zinc-800/10 dark:hover:bg-zinc-800/20 cursor-pointer rounded-lg transition group"
                    >
                      <div className="flex items-center gap-2">
                        {textFolderOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider">Kênh chữ</span>
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
                            onOpenInvite={() => setShowInviteModal(true)}
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
                      className="flex items-center justify-between px-2.5 py-1.5 mb-1.5 text-zinc-550 hover:text-zinc-300 dark:hover:text-zinc-200 hover:bg-zinc-800/10 dark:hover:bg-zinc-800/20 cursor-pointer rounded-lg transition group"
                    >
                      <div className="flex items-center gap-2">
                        {voiceFolderOpen ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
                        <span className="text-[9.5px] font-extrabold uppercase tracking-wider">Kênh thoại</span>
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
                            onOpenInvite={() => setShowInviteModal(true)}
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
            <div className="px-3 py-2.5 border-b border-zinc-950/20">
              <div className="relative flex items-center bg-zinc-100 border border-zinc-200/60 dark:bg-zinc-950 dark:border-zinc-850 rounded-full px-3 py-1.5 text-xs focus-within:ring-1 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition duration-150">
                <Search className="w-3.5 h-3.5 text-zinc-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={dmSearch}
                  onChange={(e) => setDmSearch(e.target.value)}
                  placeholder="Tìm kiếm bạn bè..."
                  className="bg-transparent border-0 text-zinc-800 dark:text-white outline-none w-full placeholder-zinc-400 dark:placeholder-zinc-600 py-0 text-xs"
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

      {/* Device dropdown backdrops */}
      {(micDropdownOpen || speakerDropdownOpen) && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => {
            setMicDropdownOpen(false);
            setSpeakerDropdownOpen(false);
          }} 
        />
      )}

      {/* Dynamic Device Dropdowns */}
      <div className="relative w-full">
        {/* Microphones Dropdown */}
        {micDropdownOpen && (
          <div className="absolute bottom-[56px] left-2 right-2 bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-2xl z-50 p-1.5 text-left animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[220px] overflow-y-auto">
            <div className="text-[10px] font-bold text-zinc-500 px-2.5 py-1 uppercase tracking-wider">Chọn Microphone</div>
            <div className="space-y-0.5 mt-1">
              {audioInputs.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => switchMicrophone(device.deviceId, device.label)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition border-0 text-left cursor-pointer ${
                    selectedMicId === device.deviceId
                      ? 'bg-indigo-600 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate mr-2">{device.label || `Microphone (${device.deviceId.slice(0, 5)})`}</span>
                  {selectedMicId === device.deviceId && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              ))}
              {audioInputs.length === 0 && (
                <div className="text-[10px] text-zinc-650 italic px-2.5 py-1.5 text-center">Không tìm thấy micro</div>
              )}
            </div>
          </div>
        )}

        {/* Speakers Dropdown */}
        {speakerDropdownOpen && (
          <div className="absolute bottom-[56px] left-2 right-2 bg-zinc-950 border border-zinc-800/80 rounded-xl shadow-2xl z-50 p-1.5 text-left animate-in fade-in slide-in-from-bottom-2 duration-150 max-h-[220px] overflow-y-auto">
            <div className="text-[10px] font-bold text-zinc-500 px-2.5 py-1 uppercase tracking-wider">Chọn Loa / Tai nghe</div>
            <div className="space-y-0.5 mt-1">
              {audioOutputs.map((device) => (
                <button
                  key={device.deviceId}
                  onClick={() => switchSpeaker(device.deviceId, device.label)}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition border-0 text-left cursor-pointer ${
                    selectedSpeakerId === device.deviceId
                      ? 'bg-indigo-650 text-white'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                  }`}
                >
                  <span className="truncate mr-2">{device.label || `Thiết bị đầu ra (${device.deviceId.slice(0, 5)})`}</span>
                  {selectedSpeakerId === device.deviceId && <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                </button>
              ))}
              {audioOutputs.length === 0 && (
                <div className="text-[10px] text-zinc-655 italic px-2.5 py-1.5 text-center">Không tìm thấy thiết bị loa</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Discord-like Voice Connection State Panel */}
      {activeVoiceChannelId && (
        <div className="px-3 py-2 bg-zinc-950/95 border-t border-zinc-900/60 flex flex-col gap-2 shadow-[0_-4px_12px_rgba(0,0,0,0.25)] select-none">
          {/* Row 1: Connection Status & Channel Info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {/* Signal strength indicator */}
              <div className="flex items-end gap-[1.5px] h-3.5 shrink-0 px-0.5">
                <div className="w-[1.5px] h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                <div className="w-[1.5px] h-2.5 bg-emerald-400 rounded-full animate-pulse" />
                <div className="w-[1.5px] h-3.5 bg-emerald-400 rounded-full animate-pulse" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-[10px] font-bold text-emerald-400 leading-tight">
                  {isConnecting ? 'Đang kết nối thoại...' : 'Đã kết nối thoại'}
                </div>
                <div className="text-[9px] text-zinc-450 font-bold truncate mt-0.5" title={voiceChannelName}>
                  {voiceChannelName}
                </div>
              </div>
            </div>
            
            {/* Direct right controls: Signal Details or Hang up */}
            <div className="flex items-center gap-0.5">
              <button
                onClick={disconnectCall}
                className="p-1 rounded hover:bg-rose-950/40 text-rose-500 hover:text-rose-400 transition-colors border-0 outline-none cursor-pointer flex items-center justify-center"
                title="Ngắt kết nối cuộc gọi"
              >
                <PhoneOff className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Row 2: Secondary controls row */}
          <div className="grid grid-cols-4 gap-1.5 border-t border-zinc-900/40 pt-1.5">
            {/* Camera Switch */}
            <button
              onClick={() => toggleCamera()}
              className={`py-1.5 px-2 rounded-lg border transition-all text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer outline-none ${
                isVideoEnabled
                  ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title={isVideoEnabled ? 'Tắt Camera' : 'Bật Camera'}
            >
              <Video className="w-3.5 h-3.5" />
            </button>

            {/* Screen Share Switch */}
            <button
              onClick={() => toggleScreenShare()}
              className={`py-1.5 px-2 rounded-lg border transition-all text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer outline-none ${
                isScreenSharing
                  ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20'
                  : 'bg-zinc-900 border-zinc-850 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              }`}
              title={isScreenSharing ? 'Tắt chia sẻ màn hình' : 'Chia sẻ màn hình'}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>

            {/* Activities Launch */}
            <button
              onClick={() => toast.info('Tính năng Hoạt động đang được phát triển!')}
              className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-855 text-zinc-450 hover:bg-zinc-800 hover:text-zinc-200 transition-all text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer outline-none"
              title="Khởi chạy Hoạt động (Activities)"
            >
              <Rocket className="w-3.5 h-3.5 text-zinc-450 hover:text-zinc-300" />
            </button>

            {/* Soundboard Trigger */}
            <button
              onClick={() => toast.info('Bảng âm thanh sẽ sớm ra mắt!')}
              className="py-1.5 px-2 rounded-lg bg-zinc-900 border border-zinc-855 text-zinc-450 hover:bg-zinc-800 hover:text-zinc-200 transition-all text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer outline-none"
              title="Bảng âm thanh (Soundboard)"
            >
              <Activity className="w-3.5 h-3.5 text-zinc-450 hover:text-zinc-300" />
            </button>
          </div>
        </div>
      )}

      {/* Discord-style User Settings Bar at the bottom of ContentExplorer */}
      <div className="relative px-2.5 py-2 bg-white dark:bg-zinc-950/90 border-t border-zinc-200 dark:border-zinc-950/60 flex items-center justify-between select-none h-[52px] shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
        {/* Left: User Info (Avatar + Name) */}
        <div className="flex items-center gap-2 min-w-0">
          <div 
            onClick={() => setPopoverOpen(!popoverOpen)}
            className="relative cursor-pointer hover:opacity-85 transition-opacity shrink-0"
          >
            <Avatar className="w-8 h-8 shadow-[0_0_8px_rgba(0,0,0,0.3)] ring-1 ring-zinc-900">
              <AvatarFallback className={`text-[10px] font-bold text-white ${getAvatarGradient(currentUser?.username || '')}`}>
                {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${getStatusColor(myStatus)} shadow-sm`} />
          </div>
          
          <div className="text-left flex-1 min-w-0 leading-tight">
            <div className="text-xs font-bold text-zinc-200 truncate">
              {currentUser?.username || 'Người dùng'}
            </div>
            <div className="text-[9px] text-zinc-500 font-semibold truncate mt-0.5">
              {getStatusLabel(myStatus)}
            </div>
          </div>
        </div>

        {/* Right: Controls (Mic, Deafen, Settings) */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => setVoiceMuted(!voiceMuted)}
            className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors border-0 outline-none cursor-pointer flex items-center justify-center ${
              voiceMuted ? 'text-rose-500 bg-rose-500/10' : 'text-zinc-400 hover:text-zinc-200 bg-transparent'
            }`}
            title={voiceMuted ? 'Bật micro' : 'Tắt micro'}
          >
            {voiceMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={() => setVoiceDeafened(!voiceDeafened)}
            className={`p-1.5 rounded-lg hover:bg-zinc-800 transition-colors border-0 outline-none cursor-pointer flex items-center justify-center ${
              voiceDeafened ? 'text-rose-500 bg-rose-500/10 animate-pulse' : 'text-zinc-400 hover:text-zinc-200 bg-transparent'
            }`}
            title={voiceDeafened ? 'Bật âm thanh' : 'Tắt âm thanh (Deafen)'}
          >
            {voiceDeafened ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Headphones className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowUserSettings(true)}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors border-0 outline-none cursor-pointer bg-transparent"
            title="Cài đặt người dùng"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Discord-style User Popout Menu */}
        {popoverOpen && (
          <div
            ref={popoverRef}
            className="absolute bottom-14 left-2 w-[220px] bg-zinc-950/95 border border-zinc-800/90 rounded-xl shadow-2xl backdrop-blur-md z-50 text-left overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            {/* Banner with user avatar gradient */}
            <div className={`h-10 w-full ${getAvatarGradient(currentUser?.username || '')} opacity-80`} />
            
            {/* Profile body */}
            <div className="px-3 pb-3 pt-6 relative">
              {/* Overlapping Avatar */}
              <div className="absolute -top-6 left-3">
                <div className="relative">
                  <Avatar className="w-12 h-12 border-2 border-zinc-950 shadow-lg">
                    <AvatarFallback className={`text-sm font-bold text-white ${getAvatarGradient(currentUser?.username || '')}`}>
                      {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 ${getStatusColor(myStatus)}`} />
                </div>
              </div>

              {/* User Info */}
              <div className="flex flex-col mb-3">
                <div className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 leading-tight">
                  {currentUser?.username || 'Người dùng'}
                </div>
                <div className="text-[10px] text-zinc-500 font-medium">
                  @{currentUser?.username?.toLowerCase() || 'nguoidung'}
                </div>
              </div>

              {/* Status Display Bubble */}
              <div className="bg-zinc-900 border border-zinc-850 rounded-lg p-2 mb-3 text-[10px] text-zinc-300 font-medium flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(myStatus)} shrink-0`} />
                <span>Trạng thái: <strong>{getStatusLabel(myStatus)}</strong></span>
              </div>

              {/* Menu items */}
              <div className="flex flex-col gap-1 border-t border-zinc-900 pt-2">
                <div className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider px-1.5 mb-1">
                  Đặt trạng thái
                </div>

                {/* Status Choices */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {(['online', 'idle', 'dnd', 'invisible'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleStatusChange(st)}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border-0 cursor-pointer text-left transition-colors ${
                        myStatus === st
                          ? 'bg-zinc-800 text-white'
                          : 'bg-zinc-900/40 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${getStatusColor(st)} shrink-0`} />
                      <span className="truncate">{getStatusLabel(st)}</span>
                      {myStatus === st && <Check className="w-2.5 h-2.5 ml-auto text-indigo-400" />}
                    </button>
                  ))}
                </div>

                <div className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider px-1.5 mb-1 border-t border-zinc-900/60 pt-2">
                  Tùy chọn
                </div>

                <button
                  onClick={() => {
                    setShowUserSettings(true);
                    setPopoverOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-md transition-colors border-0 bg-transparent text-left cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5 text-zinc-400" />
                  Sửa Hồ Sơ
                </button>

                <button
                  onClick={handleCopyUserId}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-md transition-colors border-0 bg-transparent text-left cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-zinc-400" />
                  Sao chép ID
                </button>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-[10px] font-semibold text-rose-450 hover:bg-rose-950/20 rounded-md transition-colors border-0 bg-transparent text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500" />
                    Đăng xuất
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Share bar is removed since Invite button is now on each channel list element */}

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

      <UserSettingsModal
        open={showUserSettings}
        onOpenChange={setShowUserSettings}
        onLogout={onLogout}
      />

      {activeWs && activeWorkspaceId && (
        <WorkspaceInviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          workspaceName={activeWs.name}
          inviteCode={activeWs.invite_code}
          workspaceId={activeWorkspaceId}
        />
      )}
    </div>
  );
}

