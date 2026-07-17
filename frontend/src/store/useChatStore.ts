import { create } from 'zustand';

export type SidebarFilter = 'all' | 'workspaces' | 'communities' | 'dms';

export interface RecentConversation {
  id: string;
  type: 'channel' | 'dm';
  workspaceId: string;
  timestamp: number;
}

interface ChatStore {
  activeWorkspaceId: string | null;
  activeChannelId: string | null;
  activeFilter: SidebarFilter;
  explorerOpen: boolean;
  unreadChannels: Record<string, number>;
  activeVoiceChannelId: string | null;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  recentConversations: RecentConversation[];
  typingUsers: Record<string, Record<string, number>>;
  presenceUsers: Record<string, 'online' | 'offline'>;

  // Modal open states
  showCreateWs: boolean;
  showJoinWs: boolean;
  showCreateChan: boolean;
  
  setActiveWorkspaceId: (id: string | null) => void;
  setActiveChannelId: (id: string | null, type?: 'channel' | 'dm', workspaceId?: string | null) => void;
  setActiveFilter: (filter: SidebarFilter) => void;
  toggleExplorer: () => void;
  setExplorerOpen: (open: boolean) => void;
  incrementUnread: (channelId: string) => void;
  clearUnread: (channelId: string) => void;
  setActiveVoiceChannelId: (id: string | null) => void;
  setVoiceMuted: (muted: boolean) => void;
  setVoiceDeafened: (deafened: boolean) => void;
  addRecentConversation: (id: string, type: 'channel' | 'dm', workspaceId: string) => void;
  setTypingUser: (channelId: string, username: string, timestamp: number) => void;
  setUserPresence: (username: string, status: 'online' | 'offline') => void;
  setOnlineUsers: (usernames: string[]) => void;

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
  typingUsers: {},
  presenceUsers: {},
  recentConversations: (() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('recentConversations');
        return stored ? JSON.parse(stored) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  })(),

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
  setActiveChannelId: (id, type, workspaceId) => {
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
      
      let updatedRecent = state.recentConversations;
      if (id && type && workspaceId) {
        const filtered = state.recentConversations.filter((c) => c.id !== id);
        updatedRecent = [
          { id, type, workspaceId, timestamp: Date.now() },
          ...filtered,
        ].slice(0, 50);
        if (typeof window !== 'undefined') {
          localStorage.setItem('recentConversations', JSON.stringify(updatedRecent));
        }
      }
      
      return { 
        activeChannelId: id, 
        unreadChannels: updatedUnread,
        recentConversations: updatedRecent
      };
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
  addRecentConversation: (id, type, workspaceId) =>
    set((state) => {
      const filtered = state.recentConversations.filter((c) => c.id !== id);
      const updated = [
        { id, type, workspaceId, timestamp: Date.now() },
        ...filtered,
      ].slice(0, 50);
      if (typeof window !== 'undefined') {
        localStorage.setItem('recentConversations', JSON.stringify(updated));
      }
      return { recentConversations: updated };
    }),

  setShowCreateWs: (open) => set({ showCreateWs: open }),
  setShowJoinWs: (open) => set({ showJoinWs: open }),
  setShowCreateChan: (open) => set({ showCreateChan: open }),
  setTypingUser: (channelId, username, timestamp) => set((state) => {
    const channelTyping = { ...state.typingUsers[channelId], [username]: timestamp };
    return {
      typingUsers: {
        ...state.typingUsers,
        [channelId]: channelTyping
      }
    };
  }),
  setUserPresence: (username, status) => set((state) => ({
    presenceUsers: { ...state.presenceUsers, [username]: status }
  })),
  setOnlineUsers: (usernames) => set((state) => {
    const presence: Record<string, 'online' | 'offline'> = {};
    usernames.forEach((name) => {
      presence[name] = 'online';
    });
    return { presenceUsers: presence };
  }),
}));

