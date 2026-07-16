import { create } from 'zustand';

export type SidebarFilter = 'all' | 'workspaces' | 'communities' | 'dms';

interface ChatStore {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeFilter: SidebarFilter;
  explorerOpen: boolean;
  unreadChannels: Record<string, number>;
  activeVoiceChannelId: string | null;
  voiceMuted: boolean;
  voiceDeafened: boolean;

  // Modal open states
  showCreateWs: boolean;
  showJoinWs: boolean;
  showCreateChan: boolean;
  
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveChannelId: (id: string | null) => void;
  setActiveFilter: (filter: SidebarFilter) => void;
  toggleExplorer: () => void;
  setExplorerOpen: (open: boolean) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  setActiveVoiceChannelId: (id: string | null) => void;
  setVoiceMuted: (muted: boolean) => void;
  setVoiceDeafened: (deafened: boolean) => void;

  setShowCreateWs: (open: boolean) => void;
  setShowJoinWs: (open: boolean) => void;
  setShowCreateChan: (open: boolean) => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  activeWorkspaceId: typeof window !== 'undefined' ? localStorage.getItem('lastWorkspaceId') : null,
  activeChannelId: typeof window !== 'undefined' ? localStorage.getItem('lastChannelId') : null,
  activeFilter: 'workspaces',
  explorerOpen: true,
  unreadChannels: {},
  activeVoiceChannelId: null,
  voiceMuted: false,
  voiceDeafened: false,

  // Modals state
  showCreateWs: false,
  showJoinWs: false,
  showCreateChan: false,

  setActiveWorkspaceId: (id) => {
    if (id) {
      localStorage.setItem('lastWorkspaceId', id);
    } else {
      localStorage.removeItem('lastWorkspaceId');
    }
    localStorage.removeItem('lastChannelId');
    set({ activeWorkspaceId: id, activeChannelId: null, activeFilter: 'workspaces' });
  },
  setActiveChannelId: (id) => {
    if (id) {
      localStorage.setItem('lastChannelId', id);
    } else {
      localStorage.removeItem('lastChannelId');
    }
    set((state) => {
      const updatedUnread = { ...state.unreadChannels };
      if (id) {
        updatedUnread[id] = 0;
      }
      return { activeChannelId: id, unreadChannels: updatedUnread };
    });
  },
  setActiveFilter: (filter) => set({ activeFilter: filter }),
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
  setActiveVoiceChannelId: (id) => set({ activeVoiceChannelId: id }),
  setVoiceMuted: (muted) => set({ voiceMuted: muted }),
  setVoiceDeafened: (deafened) => set({ voiceDeafened: deafened }),

  setShowCreateWs: (open) => set({ showCreateWs: open }),
  setShowJoinWs: (open) => set({ showJoinWs: open }),
  setShowCreateChan: (open) => set({ showCreateChan: open }),
}));

