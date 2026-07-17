import { Lock, Hash, UserPlus, Settings } from 'lucide-react';
import type { Channel } from '@/types';

export interface TextChannelItemProps {
  chan: Channel;
  activeChannelId: string | null;
  unreadChannels: Record<string, number>;
  handleChannelClick: (chan: Channel) => void;
  isOwnerOrAdmin: boolean;
  onOpenSettings: (chan: Channel) => void;
  onOpenInvite: () => void;
}

export function TextChannelItem({
  chan,
  activeChannelId,
  unreadChannels,
  handleChannelClick,
  isOwnerOrAdmin,
  onOpenSettings,
  onOpenInvite,
}: TextChannelItemProps) {
  const unreadCount = unreadChannels[chan.id] || 0;
  return (
    <div className="flex flex-col gap-0.5 animate-in fade-in duration-255 group relative">
      <button
        onClick={() => handleChannelClick(chan)}
        className={`w-full flex items-center justify-between pl-2 pr-12 py-1.5 rounded-lg text-xs font-semibold transition outline-none border-0 bg-transparent text-left cursor-pointer ${
          activeChannelId === chan.id
            ? 'bg-indigo-50 dark:bg-zinc-800/80 shadow-sm relative'
            : 'text-zinc-550 dark:text-zinc-400 hover:bg-zinc-800/20 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-zinc-200'
        }`}
      >
        {activeChannelId === chan.id && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-md" />
        )}
        <div className="flex items-center gap-2 truncate">
          {chan.is_private ? (
            <Lock className={`w-3.5 h-3.5 ${activeChannelId === chan.id ? 'text-indigo-500 dark:text-zinc-350' : 'text-zinc-500'}`} />
          ) : (
            <Hash className={`w-3.5 h-3.5 ${activeChannelId === chan.id ? 'text-indigo-500 dark:text-zinc-350' : 'text-zinc-500'}`} />
          )}
          <span className={`truncate ${
            activeChannelId === chan.id 
              ? 'text-indigo-600 dark:text-zinc-200' 
              : unreadCount > 0 
                ? 'font-bold text-zinc-100 dark:text-white' 
                : 'text-zinc-550 dark:text-zinc-450'
          }`}>
            {chan.name}
          </span>
        </div>
        {unreadCount > 0 && (
          <span className="flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-rose-500 rounded-full shrink-0 mr-1">
            {unreadCount}
          </span>
        )}
      </button>

      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20">
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
    </div>
  );
}
