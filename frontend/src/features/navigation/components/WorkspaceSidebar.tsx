import { useChatStore } from '@/store/useChatStore';
import type { SidebarFilter } from '@/store/useChatStore';
import { useQuery, useQueries } from '@tanstack/react-query';
import { Sparkles, MessageSquare, Layers, Globe, Users } from 'lucide-react';
import api from '@/lib/api';
import type { Workspace, Channel, DMChannel } from '@/types';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function WorkspaceSidebar() {
  const { 
    activeWorkspaceId, 
    activeFilter, 
    setActiveFilter,
    unreadChannels,
    setActiveChannelId
  } = useChatStore();

  const { data: workspacesData } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });
  const workspaces = workspacesData || [];

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
              className="w-full flex justify-center"
              render={
                <button 
                  onClick={() => {
                    setActiveFilter('all');
                    setActiveChannelId(null);
                  }}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-all duration-300 relative outline-none border ${
                    activeFilter === 'all'
                      ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm'
                      : 'bg-indigo-600/10 dark:bg-indigo-650/10 border-indigo-500/10 dark:border-indigo-500/20 text-indigo-400 hover:border-transparent hover:bg-indigo-600 hover:text-white hover:rounded-xl shadow-indigo-500/5'
                  }`}
                >
                  {activeFilter === 'all' && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-500 rounded-r-full" />
                  )}
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
                    className="w-full flex justify-center"
                    render={
                      <button
                        onClick={() => setActiveFilter(filter.id)}
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-300 relative group outline-none border-0 ${
                          isActive
                            ? 'bg-indigo-50 dark:bg-zinc-800/80 text-indigo-600 dark:text-zinc-200 rounded-xl'
                            : 'text-zinc-550 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:rounded-xl'
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

        {/* Bottom spacer */}
        <div className="mt-auto w-full" />
      </div>
    </TooltipProvider>
  );
}
