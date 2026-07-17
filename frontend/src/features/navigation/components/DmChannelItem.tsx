import { useQuery } from '@tanstack/react-query';
import { PhoneCall } from 'lucide-react';
import api from '@/lib/api';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

export interface DmChannelItemProps {
  dm: {
    id: string;
    username: string;
    status: string;
    statusColor: string;
    statusText?: string;
  };
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeVoiceChannelId: string | null;
  handleChannelClick: (id: string) => void;
}

export function DmChannelItem({
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
    <div className="flex flex-col gap-0.5 animate-in fade-in duration-255 relative">
      <button
        onClick={() => handleChannelClick(dm.id)}
        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-xs font-semibold transition outline-none border-0 bg-transparent text-left cursor-pointer ${
          isActive
            ? 'bg-indigo-50 dark:bg-zinc-800/80 shadow-sm relative'
            : 'text-zinc-550 dark:text-zinc-400 hover:bg-zinc-800/20 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-zinc-200'
        }`}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-md" />
        )}
        <div className="relative shrink-0">
          <Avatar size="sm" className={`shadow-[0_0_8px_rgba(0,0,0,0.3)] transition-all ${dm.status === 'online' ? 'ring-1 ring-emerald-500/20' : ''}`}>
            <AvatarFallback className={`text-[10px] font-semibold ${getAvatarGradient(dm.username)}`}>
              {dm.username.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 ${dm.statusColor} shadow-sm`} />
        </div>
        <div className="truncate text-left flex-1 min-w-0">
          <div className={`truncate font-semibold ${
            isUserInThisVoice 
              ? 'text-emerald-400' 
              : isActive 
                ? 'text-indigo-600 dark:text-zinc-200' 
                : 'text-zinc-300 dark:text-zinc-200'
          }`}>{dm.username}</div>
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
