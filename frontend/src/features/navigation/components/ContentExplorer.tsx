import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import { Plus, Hash, Volume2, ChevronDown } from 'lucide-react';
import api from '@/lib/api';
import type { Channel, Workspace } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ContentExplorerProps {
  onCreateChanClick: () => void;
}

export default function ContentExplorer({ onCreateChanClick }: ContentExplorerProps) {
  const {
    activeWorkspaceId,
    activeChannelId,
    explorerOpen,
    setActiveChannelId,
    toggleExplorer,
  } = useChatStore();

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

  // Fetch workspaces (cached) to find active workspace name
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const res = await api.get('/workspaces');
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  // Fetch channels for active workspace
  const { data: channels = [], isLoading } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/channels`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  if (!explorerOpen) return null;

  return (
    <div className="w-[240px] bg-zinc-900 flex flex-col justify-between border-r border-zinc-950/80 h-full select-none">
      <div className="flex flex-col flex-1 min-h-0">
        {/* Active Workspace Header */}
        <div className="px-4 py-3 h-[52px] border-b border-zinc-950/80 flex items-center justify-between cursor-pointer hover:bg-zinc-800/40 transition">
          <h1 className="font-bold text-white truncate text-sm">
            {activeWs?.name || 'Chọn không gian'}
          </h1>
          <ChevronDown className="w-4 h-4 text-zinc-400" />
        </div>

        {/* Content list */}
        {activeWorkspaceId ? (
          <ScrollArea className="flex-1 px-2 py-3">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between px-2 mb-2 text-zinc-400">
                  <span className="text-xs font-semibold uppercase tracking-wider">Các kênh chat</span>
                  <button
                    onClick={onCreateChanClick}
                    className="p-0.5 hover:bg-zinc-800 hover:text-white rounded transition outline-none"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Channel List */}
                <div className="space-y-0.5">
                  {channels.map((chan) => (
                    <button
                      key={chan.id}
                      onClick={() => setActiveChannelId(chan.id)}
                      className={`w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm font-medium transition outline-none ${
                        activeChannelId === chan.id
                          ? 'bg-zinc-800 text-white'
                          : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {chan.type === 'text' ? (
                          <Hash className="w-4 h-4 text-zinc-500" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-zinc-500" />
                        )}
                        <span className="truncate">{chan.name}</span>
                      </div>
                      {chan.type === 'voice' && (
                        <span className="flex h-2 w-2 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                      )}
                    </button>
                  ))}

                  {channels.length === 0 && !isLoading && (
                    <p className="text-xs text-zinc-500 italic text-center py-4">Chưa có kênh nào</p>
                  )}
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-zinc-500 text-center">Chọn hoặc tạo mới không gian làm việc để xem danh sách kênh.</p>
          </div>
        )}
      </div>

      {/* Share / Active Workspace ID */}
      {activeWorkspaceId && (
        <div className="p-3 bg-zinc-950/40 m-2 rounded-lg border border-zinc-800/30 text-xs">
          <span className="text-zinc-500 block font-semibold mb-1">ID Không gian:</span>
          <span className="text-zinc-300 font-mono select-text break-all block p-1 bg-zinc-950 rounded border border-zinc-900/60">
            {activeWorkspaceId}
          </span>
        </div>
      )}
    </div>
  );
}
