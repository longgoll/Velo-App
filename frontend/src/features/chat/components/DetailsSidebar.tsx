import { useState } from 'react';
import { X, Bell, BellOff, Pin, Users, Settings, Image, FileText, Link2, ExternalLink, Hash, Volume2 } from 'lucide-react';
import type { ChatMessage, WorkspaceMember, Channel, DMChannel } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import { getAvatarGradient } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from '@/store/useToastStore';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DetailsSidebarProps {
  onClose: () => void;
  messages: ChatMessage[];
  onOpenSettings?: () => void;
}

// Helpers to parse media
const parseImageContent = (content: string) => {
  if (!content.startsWith('[image:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(7, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const httpMatch = urlsPart.match(/:(https?:\/\/)/);
  if (httpMatch && httpMatch.index !== undefined) {
    const originalUrl = urlsPart.slice(0, httpMatch.index);
    return { fileName, url: originalUrl };
  }
  return { fileName, url: urlsPart };
};

const parseFileContent = (content: string) => {
  if (!content.startsWith('[file:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(6, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const lastColonIdx = urlsPart.lastIndexOf(':');
  if (lastColonIdx === -1) {
    return { fileName, url: urlsPart, size: 'Unknown' };
  }
  const url = urlsPart.slice(0, lastColonIdx);
  const size = urlsPart.slice(lastColonIdx + 1);

  return { fileName, url, size };
};

const extractLinks = (content: string) => {
  // Ignore custom codes
  if (content.startsWith('[image:') || content.startsWith('[file:') || content.startsWith('[call:')) {
    return [];
  }
  // Simple url regex
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = content.match(urlRegex);
  return matches || [];
};

export default function DetailsSidebar({ onClose, messages, onOpenSettings }: DetailsSidebarProps) {
  const { activeWorkspaceId, activeChannelId, presenceUsers } = useChatStore();
  const [isMuted, setIsMuted] = useState(false);

  // Retrieve current user
  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Query workspace members
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Query channels list
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  // Query DM channels
  const { data: dmChannels = [] } = useQuery<DMChannel[]>({
    queryKey: ['dms', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await api.get(`/workspaces/${activeWorkspaceId}/dms`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeDmChannel = dmChannels.find((d) => d.id === activeChannelId);

  // Query channel members if private
  const { data: channelMembers = [] } = useQuery<any[]>({
    queryKey: ['channel-members', activeChannelId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${activeChannelId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId && !!activeChannelId && !!activeChannel?.is_private,
  });

  // Identify visible members for the current channel / DM
  let visibleMembers: WorkspaceMember[] = [];
  let title = 'Thông tin chi tiết';
  let subTitle = '';
  let isDm = false;
  let otherDmUser: any = null;

  if (activeDmChannel) {
    isDm = true;
    const otherUser = activeDmChannel.user_one_id === currentUser?.id ? activeDmChannel.user_two : activeDmChannel.user_one;
    otherDmUser = otherUser;
    title = otherUser?.username || 'Trò chuyện';
    subTitle = 'Trò chuyện trực tiếp';
    // Show only the two DM participants
    const memberOne = members.find(m => m.user_id === activeDmChannel.user_one_id);
    const memberTwo = members.find(m => m.user_id === activeDmChannel.user_two_id);
    if (memberOne) visibleMembers.push(memberOne);
    if (memberTwo && activeDmChannel.user_one_id !== activeDmChannel.user_two_id) visibleMembers.push(memberTwo);
  } else if (activeChannel) {
    title = activeChannel.name;
    subTitle = activeChannel.type === 'voice' ? 'Kênh thoại' : 'Kênh chữ';
    if (activeChannel.is_private) {
      // Filter workspace members that are in the private channel
      visibleMembers = members.filter(m => channelMembers.some(cm => cm.user_id === m.user_id));
    } else {
      visibleMembers = members;
    }
  }

  // Parse media from channel messages
  const sharedImages: { fileName: string; url: string }[] = [];
  const sharedFiles: { fileName: string; url: string; size: string }[] = [];
  const sharedLinks: { url: string; msgUser: string }[] = [];

  messages.forEach((msg) => {
    const img = parseImageContent(msg.content);
    if (img) {
      sharedImages.push(img);
    }
    const file = parseFileContent(msg.content);
    if (file) {
      sharedFiles.push(file);
    }
    const links = extractLinks(msg.content);
    links.forEach((url) => {
      sharedLinks.push({ url, msgUser: msg.username });
    });
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'idle': return 'bg-amber-500';
      case 'dnd': return 'bg-rose-500';
      case 'invisible': return 'bg-zinc-500';
      default: return 'bg-zinc-500';
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    toast.success(isMuted ? 'Đã bật thông báo cho kênh này.' : 'Đã tắt tiếng thông báo kênh này.');
  };

  const handlePinClick = () => {
    toast.info('Tính năng ghim tin nhắn sẽ sớm ra mắt!');
  };

  const handleMembersClick = () => {
    toast.info(`Kênh này có ${visibleMembers.length} thành viên.`);
  };

  const getDomainName = (url: string) => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.startsWith('www.') ? hostname.substring(4) : hostname;
    } catch {
      return 'Liên kết';
    }
  };

  const myRole = members.find(m => m.user_id === currentUser?.id)?.role || 'member';
  const isOwnerOrAdmin = myRole === 'owner' || myRole === 'admin';

  return (
    <div className="w-[320px] border-l border-zinc-200 dark:border-zinc-950/60 bg-zinc-900/95 flex flex-col h-full shrink-0 z-20 animate-in slide-in-from-right duration-255 relative select-none">
      {/* Header */}
      <div className="px-4 h-[52px] border-b border-zinc-200 dark:border-zinc-950 flex items-center justify-between bg-white dark:bg-zinc-900/40 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="font-bold text-white text-sm">Thông tin nhóm</span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-white rounded-lg transition border-0 outline-none cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        <div className="space-y-6">
          {/* Main Info */}
          <div className="flex flex-col items-center text-center">
            {isDm ? (
              <Avatar className="w-16 h-16 shadow-[0_0_12px_rgba(0,0,0,0.3)] border-2 border-zinc-950">
                <AvatarFallback className={`text-xl font-bold text-white ${getAvatarGradient(otherDmUser?.username || '')}`}>
                  {otherDmUser?.username ? otherDmUser.username.slice(0, 2).toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-indigo-650/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-md">
                {activeChannel?.type === 'voice' ? <Volume2 className="w-8 h-8" /> : <Hash className="w-8 h-8" />}
              </div>
            )}

            <h2 className="text-base font-bold text-white mt-4 tracking-tight truncate max-w-[260px]">{title}</h2>
            <p className="text-[11px] text-zinc-500 font-medium mt-1 uppercase tracking-wider">{subTitle}</p>
            {!isDm && (
              <div className="mt-2 text-[10px] bg-zinc-950/40 border border-zinc-850 px-2 py-0.5 rounded-full text-zinc-400 font-semibold">
                {visibleMembers.length} thành viên
              </div>
            )}
          </div>

          {/* Quick Actions (4-grid icons) */}
          <div className="grid grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={handleMuteToggle}
              className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all text-xs font-semibold cursor-pointer outline-none ${
                isMuted
                  ? 'bg-rose-500/10 border-rose-500/20 text-rose-450 hover:bg-rose-500/20'
                  : 'bg-zinc-950/30 border-zinc-850 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
              }`}
              title={isMuted ? 'Bật thông báo' : 'Tắt tiếng'}
            >
              {isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
              <span className="text-[9px]">Tắt tiếng</span>
            </button>

            <button
              onClick={handlePinClick}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-zinc-950/30 border border-zinc-850 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 transition-all text-xs font-semibold cursor-pointer outline-none"
            >
              <Pin className="w-4 h-4" />
              <span className="text-[9px]">Đã ghim</span>
            </button>

            <button
              onClick={handleMembersClick}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-zinc-950/30 border border-zinc-850 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 transition-all text-xs font-semibold cursor-pointer outline-none"
            >
              <Users className="w-4 h-4" />
              <span className="text-[9px]">Thành viên</span>
            </button>

            <button
              onClick={() => {
                if (onOpenSettings) {
                  onOpenSettings();
                } else {
                  toast.info('Chức năng cài đặt mở từ sidebar chính.');
                }
              }}
              disabled={!isOwnerOrAdmin && !isDm}
              className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-zinc-950/30 border border-zinc-850 text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200 disabled:opacity-40 disabled:hover:bg-zinc-950/30 disabled:cursor-not-allowed transition-all text-xs font-semibold cursor-pointer outline-none"
            >
              <Settings className="w-4 h-4" />
              <span className="text-[9px]">Cài đặt</span>
            </button>
          </div>

          <div className="border-t border-zinc-950/60 my-2" />

          {/* Members List */}
          <div>
            <div className="flex items-center justify-between text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-3">
              <span>Thành viên ({visibleMembers.length})</span>
            </div>
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {visibleMembers.map((m) => {
                if (!m.user) return null;
                const status = presenceUsers[m.user.username] || 'offline';
                return (
                  <div key={m.user.id} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className={`text-[10px] font-bold text-white ${getAvatarGradient(m.user.username)}`}>
                            {m.user.username.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-zinc-900 ${getStatusColor(status)}`} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold text-zinc-200 truncate">{m.user.username}</div>
                        {m.role !== 'member' && (
                          <div className="text-[8px] text-indigo-400 font-bold uppercase tracking-wider mt-0.5">
                            {m.role === 'owner' ? 'Chủ sở hữu' : 'Quản trị'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Shared Images Grid */}
          {sharedImages.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-3">
                Ảnh đã chia sẻ ({sharedImages.length})
              </div>
              <div className="grid grid-cols-3 gap-2">
                {sharedImages.slice(0, 6).map((img, idx) => (
                  <a
                    key={idx}
                    href={img.url}
                    target="_blank"
                    rel="noreferrer"
                    className="relative aspect-square rounded-lg overflow-hidden border border-zinc-850 hover:border-zinc-700 transition"
                  >
                    <img src={img.url} alt={img.fileName} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Shared Files List */}
          {sharedFiles.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-3">
                Tệp tin đính kèm ({sharedFiles.length})
              </div>
              <div className="space-y-2">
                {sharedFiles.slice(0, 3).map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="flex items-center gap-2.5 p-2 bg-zinc-950/20 border border-zinc-850 rounded-xl hover:bg-zinc-950/40 hover:border-zinc-750 transition text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-850 flex items-center justify-center text-zinc-500 shrink-0 group-hover:text-indigo-400">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-zinc-300 truncate group-hover:text-white transition-colors">
                        {file.fileName}
                      </div>
                      <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{file.size}</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Shared Links List */}
          {sharedLinks.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-zinc-550 uppercase tracking-widest mb-3">
                Liên kết đã gửi ({sharedLinks.length})
              </div>
              <div className="space-y-2">
                {sharedLinks.slice(0, 3).map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 bg-zinc-950/20 border border-zinc-850 rounded-xl hover:bg-zinc-950/40 hover:border-zinc-750 transition text-left group"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                      <Link2 className="w-4 h-4 text-zinc-500 shrink-0 group-hover:text-indigo-400" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-zinc-300 truncate group-hover:text-white transition-colors">
                          {getDomainName(link.url)}
                        </div>
                        <div className="text-[9px] text-zinc-500 truncate mt-0.5">
                          Gửi bởi @{link.msgUser}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>
      </ScrollArea>
    </div>
  );
}
