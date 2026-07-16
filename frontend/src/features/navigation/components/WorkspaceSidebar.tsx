import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Plus, Compass, LogOut, Sparkles } from 'lucide-react';
import api from '@/lib/api';
import type { Workspace, UserData } from '@/types';
import { Avatar, AvatarFallback, AvatarBadge } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkspaceSidebarProps {
  user: UserData | null;
  onLogout: () => void;
  onCreateWsClick: () => void;
  onJoinWsClick: () => void;
}

export default function WorkspaceSidebar({
  user,
  onLogout,
  onCreateWsClick,
  onJoinWsClick,
}: WorkspaceSidebarProps) {
  const { activeWorkspaceId, setActiveWorkspaceId } = useChatStore();

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
  });

  return (
    <TooltipProvider>
      <div className="w-[64px] bg-zinc-950 flex flex-col items-center py-4 justify-between border-r border-zinc-900/50 h-full select-none">
        <div className="flex flex-col gap-4 items-center w-full">
          {/* Logo / Sparkles */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-white cursor-pointer hover:bg-indigo-600 hover:rounded-xl transition-all duration-200 shadow-md border-0 outline-none">
                  <Sparkles className="w-6 h-6 text-indigo-400 hover:text-white transition" />
                </button>
              }
            />
            <TooltipContent side="right">Antigravity Chat</TooltipContent>
          </Tooltip>

          <div className="w-8 h-[2px] bg-zinc-800 rounded-full" />

          {/* Active Workspace List */}
          <div className="flex flex-col gap-2 overflow-y-auto max-h-[50vh] no-scrollbar w-full items-center">
            {workspaces.map((ws) => (
              <Tooltip key={ws.id}>
                <TooltipTrigger
                  render={
                    <button
                      onClick={() => setActiveWorkspaceId(ws.id)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold cursor-pointer transition-all duration-200 relative group outline-none border-0 ${
                        activeWorkspaceId === ws.id
                          ? 'bg-indigo-600 rounded-xl'
                          : 'bg-zinc-900 hover:bg-indigo-600 hover:rounded-xl'
                      }`}
                    >
                      {/* Active Left Indicator */}
                      <div
                        className={`absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ${
                          activeWorkspaceId === ws.id
                            ? 'h-8'
                            : 'h-0 group-hover:h-4'
                        }`}
                      />
                      {ws.name.slice(0, 2).toUpperCase()}
                    </button>
                  }
                />
                <TooltipContent side="right">{ws.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="w-8 h-[2px] bg-zinc-800 rounded-full" />

          {/* Create Workspace */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onCreateWsClick}
                  className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer hover:bg-zinc-800 hover:rounded-xl transition-all duration-200 outline-none border-0"
                >
                  <Plus className="w-6 h-6" />
                </button>
              }
            />
            <TooltipContent side="right">Tạo Không gian</TooltipContent>
          </Tooltip>

          {/* Join Workspace */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onJoinWsClick}
                  className="w-12 h-12 bg-zinc-900 rounded-2xl flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer hover:bg-zinc-800 hover:rounded-xl transition-all duration-200 outline-none border-0"
                >
                  <Compass className="w-6 h-6" />
                </button>
              }
            />
            <TooltipContent side="right">Tham gia Không gian</TooltipContent>
          </Tooltip>
        </div>

        {/* User Info & Settings */}
        <div className="flex flex-col gap-4 items-center w-full">
          {/* Logout */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={onLogout}
                  className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-red-400 hover:bg-red-950 hover:text-red-300 cursor-pointer transition border border-transparent hover:border-red-900/50 outline-none"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              }
            />
            <TooltipContent side="right">Đăng xuất</TooltipContent>
          </Tooltip>

          {/* Avatar Profile */}
          <Tooltip>
            <TooltipTrigger
              render={
                <button className="relative cursor-pointer focus:outline-none bg-transparent border-0 p-0">
                  <Avatar size="lg" className="border-2 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                    <AvatarFallback className="bg-indigo-900 text-white font-bold">
                      {user?.username ? user.username.slice(0, 1).toUpperCase() : '?'}
                    </AvatarFallback>
                    <AvatarBadge className="bg-emerald-500 border-zinc-950" />
                  </Avatar>
                </button>
              }
            />
            <TooltipContent side="right">
              <div className="text-xs">
                <p className="font-semibold">{user?.username}</p>
                <p className="text-zinc-400">{user?.email}</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
