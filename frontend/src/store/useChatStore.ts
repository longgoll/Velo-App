import { create } from 'zustand';

interface ChatStore {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  explorerOpen: boolean;
  unreadChannels: Record<string, number>;
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  toggleExplorer: () => void;
  setExplorerOpen: (open: boolean) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeWorkspaceId: null,
  activeChannelId: null,
  explorerOpen: true,
  unreadChannels: {},
  setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id, activeChannelId: null }),
  setActiveChannelId: (id) =>
    set((state) => {
      const updatedUnread = { ...state.unreadChannels };
      if (id) {
        updatedUnread[id] = 0;
      }
      return { activeChannelId: id, unreadChannels: updatedUnread };
    }),
  toggleExplorer: () => set((state) => ({ explorerOpen: !state.explorerOpen })),
  setExplorerOpen: (open) => set({ explorerOpen: open }),
  incrementUnread: (channelId) =>
    set((state) => {
      if (state.activeChannelId === channelId) return {};
      const updatedUnread = { ...state.unreadChannels };
      updatedUnread[channelId] = (updatedUnread[channelId] || 0) + 1;
      return { unreadChannels: updatedUnread };
    }),
  clearUnread: (channelId) =>
    set((state) => {
      const updatedUnread = { ...state.unreadChannels };
      updatedUnread[channelId] = 0;
      return { unreadChannels: updatedUnread };
    }),
}));
