import { useQuery } from '@tanstack/react-query';
import { Lock, Volume2, UserPlus, Settings } from 'lucide-react';
import api from '@/lib/api';
import type { Channel } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

export interface VoiceChannelItemProps {
  chan: Channel;
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeVoiceChannelId: string | null;
  handleChannelClick: (chan: Channel) => void;
  isOwnerOrAdmin: boolean;
  onOpenSettings: (chan: Channel) => void;
  onOpenInvite: () => void;
}

export function VoiceChannelItem({
  chan,
  activeWorkspaceId,
  activeChannelId,
  activeVoiceChannelId,
  handleChannelClick,
  isOwnerOrAdmin,
  onOpenSettings,
  onOpenInvite,
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
        className={`w-full flex items-center justify-between pl-2 pr-12 py-1.5 rounded-lg text-xs font-medium transition outline-none border-0 bg-transparent text-left cursor-pointer ${
          activeChannelId === chan.id
            ? 'bg-zinc-800/80 text-white'
            : 'text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          {chan.is_private ? (
            <Lock className={`w-3.5 h-3.5 ${isUserInThisVoice || participants.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
          ) : (
            <Volume2 className={`w-3.5 h-3.5 ${isUserInThisVoice || participants.length > 0 ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
          )}
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

      <div className="absolute right-1.5 top-[6px] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenInvite();
          }}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white border-0 bg-transparent cursor-pointer"
          title="Mời thành viên vào không gian"
        >
          <UserPlus className="w-3.5 h-3.5" />
        </button>
        {isOwnerOrAdmin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings(chan);
            }}
            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-white border-0 bg-transparent cursor-pointer"
            title="Cài đặt kênh"
          >
            <Settings className="w-3 h-3" />
          </button>
        )}
      </div>

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
