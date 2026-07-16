import { create } from 'zustand';

interface ChatStore {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  explorerOpen: boolean;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  toggleExplorer: () => void;
  setExplorerOpen: (open: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeWorkspaceId: null,
  activeChannelId: null,
  explorerOpen: true,
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, activeChannelId: null }),
  setActiveChannelId: (id) => set({ activeChannelId: id }),
  toggleExplorer: () => set((state) => ({ explorerOpen: !state.explorerOpen })),
  setExplorerOpen: (open) => set({ explorerOpen: open }),
}));
