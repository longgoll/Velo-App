import { useChatStore } from '@/store/useChatStore';
import type { SidebarFilter } from '@/store/useChatStore';
import { useQuery, useQueries } from '@tanstack/react-query';
import { LogOut, Sparkles, MessageSquare, Layers, Globe, Users, Settings } from 'lucide-react';
import api from '@/lib/api';
import type { Workspace, UserData, Channel, DMChannel } from '@/types';
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkspaceSidebarProps {
  user: UserData | null;
  onLogout: () => void;
}

export default function WorkspaceSidebar({
  user,
  onLogout,
}: WorkspaceSidebarProps) {
  const { 
    activeWorkspaceId, 
    activeFilter, 
    setActiveFilter,
    unreadChannels,
    setActiveChannelId
  } = useChatStore();

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  // Fetch channels for all workspaces
  const channelsQueries = useQueries({
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
  const dmsQueries = useQueries({
    queries: workspaces.map((ws) => ({
      queryKey: ['dms', ws.id],
      queryFn: async () => {
        const res = await api.get(`/workspaces/${ws.id}/dms`);
        return res.data as DMChannel[];
      },
      enabled: workspaces.length > 0,
    })),
  });

  const allChannels = channelsQueries.flatMap((q) => q.data || []);
  const allDms = dmsQueries.flatMap((q) => q.data || []);

  const allChannelIds = allChannels.map((c) => c.id);
  const allDmIds = allDms.map((d) => d.id);

  // Compute unread counts
  const totalUnread = Object.keys(unreadChannels).reduce((sum, id) => sum + (unreadChannels[id] || 0), 0);
  const workspaceUnread = Object.keys(unreadChannels)
    .filter((id) => allChannelIds.includes(id))
    .reduce((sum, id) => sum + (unreadChannels[id] || 0), 0);
  const dmUnread = Object.keys(unreadChannels)
    .filter((id) => allDmIds.includes(id))
    .reduce((sum, id) => sum + (unreadChannels[id] || 0), 0);

  // Check if any other workspace has unread messages
  const hasOtherWorkspaceUnreads = workspaces.some((ws) => {
    if (ws.id === activeWorkspaceId) return false;
    const wsChannels = allChannels.filter((c) => c.workspace_id === ws.id).map((c) => c.id);
    const wsDms = allDms.filter((d) => d.workspace_id === ws.id).map((d) => d.id);
    const wsIds = [...wsChannels, ...wsDms];
    return wsIds.some((id) => (unreadChannels[id] || 0) > 0);
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  // Filters list
  const filters: { id: SidebarFilter; label: string; icon: any }[] = [
    { id: 'all', label: 'Tất cả tin nhắn', icon: MessageSquare },
    { id: 'workspaces', label: 'Không gian làm việc', icon: Layers },
    { id: 'communities', label: 'Cộng đồng', icon: Globe },
    { id: 'dms', label: 'Tin nhắn trực tiếp (DMs)', icon: Users },
  ];

  return (
    <TooltipProvider>
      <div className="w-[64px] bg-zinc-950 flex flex-col items-center py-4 justify-between border-r border-zinc-900/50 h-full select-none shrink-0 z-20">
        <div className="flex flex-col gap-6 items-center w-full">
          {/* Top: Global active workspace indicator */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button 
                  onClick={() => {
                    setActiveFilter('all');
                    setActiveChannelId(null);
                  }}
                  className="w-12 h-12 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 font-bold hover:bg-indigo-600 hover:text-white hover:rounded-xl transition-all duration-300 shadow-lg shadow-indigo-500/5 cursor-pointer relative outline-none"
                >
                  {activeWs ? (
                    <span className="text-sm font-semibold tracking-wider font-mono">
                      {activeWs.name.slice(0, 2).toUpperCase()}
                    </span>
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                  {hasOtherWorkspaceUnreads && (
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-zinc-950 animate-pulse" />
                  )}
                </button>
              }
            />
            <TooltipContent side="right">
              {activeWs ? `Đang ở: ${activeWs.name}` : 'Antigravity Chat'}
            </TooltipContent>
          </Tooltip>

          <div className="w-8 h-[1px] bg-zinc-900" />

          {/* Center: Vertical Context Filters */}
          <div className="flex flex-col gap-3 w-full items-center">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <Tooltip key={filter.id}>
                  <TooltipTrigger
                    render={
                      <button
                        onClick={() => setActiveFilter(filter.id)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 relative group outline-none border-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-600/20'
                            : 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 hover:rounded-xl'
                        }`}
                      >
                        {/* Active Left Indicator */}
                        <div
                          className={`absolute left-0 w-1 bg-indigo-500 rounded-r-full transition-all duration-300 ${
                            isActive ? 'h-6' : 'h-0 group-hover:h-3'
                          }`}
                        />
                        <Icon className="w-5 h-5 transition-transform group-hover:scale-105" />
                        
                        {/* Unread badge count */}
                        {filter.id === 'all' && totalUnread > 0 && (
                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-zinc-950 animate-in zoom-in duration-200">
                            {totalUnread}
                          </span>
                        )}
                        {filter.id === 'workspaces' && workspaceUnread > 0 && (
                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-zinc-950 animate-in zoom-in duration-200">
                            {workspaceUnread}
                          </span>
                        )}
                        {filter.id === 'dms' && dmUnread > 0 && (
                          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-zinc-950 animate-in zoom-in duration-200">
                            {dmUnread}
                          </span>
                        )}
                      </button>
                    }
                  />
                  <TooltipContent side="right">{filter.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Bottom: Settings, Logout, Avatar */}
        <div className="flex flex-col gap-4 items-center w-full">
          {/* Quick Settings */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 cursor-pointer transition outline-none border-0"
                >
                  <Settings className="w-5 h-5" />
                </button>
              }
            />
            <TooltipContent side="right">Cài đặt nhanh</TooltipContent>
          </Tooltip>

          {/* Logout */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onLogout}
                  className="w-10 h-10 bg-transparent rounded-xl flex items-center justify-center text-zinc-500 hover:bg-red-950/20 hover:text-red-400 cursor-pointer transition outline-none border-0"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              }
            />
            <TooltipContent side="right">Đăng xuất</TooltipContent>
          </Tooltip>

          <div className="w-8 h-[1px] bg-zinc-900" />

          {/* Avatar Profile */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button className="relative cursor-pointer focus:outline-none bg-transparent border-0 p-0">
                  <Avatar size="lg" className="shadow-[0_0_12px_rgba(0,0,0,0.4)]">
                    <AvatarFallback className={`font-semibold select-none text-xs ${getAvatarGradient(user?.username || '')}`}>
                      {user?.username ? user.username.slice(0, 1).toUpperCase() : '?'}
                    </AvatarFallback>
                    <AvatarBadge className="bg-emerald-500 border-zinc-950 w-2.5 h-2.5" />
                  </Avatar>
                </button>
              }
            />
            <TooltipContent side="right">
              <div className="text-xs p-1">
                <p className="font-semibold text-zinc-200">{user?.username}</p>
                <p className="text-zinc-500 text-[10px] mt-0.5">{user?.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

