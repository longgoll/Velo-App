import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import type { UserData } from '@/types';
import AuthScreen from '@/features/auth/components/AuthScreen';
import WorkspaceSidebar from '@/features/navigation/components/WorkspaceSidebar';
import ContentExplorer from '@/features/navigation/components/ContentExplorer';
import ChatViewport from '@/features/chat/components/ChatViewport';
import CreateWorkspaceModal from '@/features/workspace/components/CreateWorkspaceModal';
import JoinWorkspaceModal from '@/features/workspace/components/JoinWorkspaceModal';
import CreateChannelModal from '@/features/workspace/components/CreateChannelModal';
import CommandPalette from '@/components/ui/CommandPalette';
import { useChatStore } from '@/store/useChatStore';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Toaster from '@/components/ui/Toaster';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { toast } from '@/store/useToastStore';
import { VoiceCallProvider } from '@/context/VoiceCallContext';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserData | null>(null);

  const {
    showCreateWs,
    setShowCreateWs,
    showJoinWs,
    setShowJoinWs,
    showCreateChan,
    setShowCreateChan,
    setActiveWorkspaceId,
  } = useChatStore();

  const queryClient = useQueryClient();

  // WebSocket connection
  const { sendMessage, sendTyping } = useWebSocket(token);

  // Fetch logged in user data
  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [token]);

  // Load chat context when user logs in or mounts
  useEffect(() => {
    if (user?.id) {
      useChatStore.getState().loadUserContext(user.id);
    }
  }, [user?.id]);

  // Handle direct invite link
  useEffect(() => {
    if (token) {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('invite');
      if (inviteCode && inviteCode.trim()) {
        const joinWorkspace = async () => {
          try {
            const res = await api.post('/workspaces/join', { invite_code: inviteCode.trim() });
            queryClient.invalidateQueries({ queryKey: ['workspaces'] });
            setActiveWorkspaceId(res.data.id);
            toast.success(`Đã gia nhập Không gian làm việc "${res.data.name}" thành công qua mã mời!`);
          } catch (err: any) {
            toast.error(err.response?.data?.error || 'Mã mời không hợp lệ hoặc đã hết hạn.');
          } finally {
            const newUrl = window.location.pathname;
            window.history.replaceState({}, document.title, newUrl);
          }
        };
        joinWorkspace();
      }
    }
  }, [token, queryClient, setActiveWorkspaceId]);

  const handleAuthSuccess = (newToken: string, newUser: UserData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    useChatStore.getState().loadUserContext(newUser.id);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastWorkspaceId');
    localStorage.removeItem('lastChannelId');
    setToken(null);
    setUser(null);
    useChatStore.getState().logout();
  };

  if (!token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <VoiceCallProvider>
      <div className="flex h-screen bg-zinc-950 text-zinc-200 select-none overflow-hidden">
        {/* 1. Slim Left Navigation Sidebar */}
        <WorkspaceSidebar
          user={user}
          onLogout={handleLogout}
        />

        {/* 2. Fluid Content Explorer Sidebar */}
        <ContentExplorer />

        {/* 3. Main Chat Viewport */}
        <ChatViewport onSendMessage={sendMessage} onSendTyping={sendTyping} />

        {/* --- Dialog / Modals --- */}
        <CreateWorkspaceModal open={showCreateWs} onOpenChange={setShowCreateWs} />
        <JoinWorkspaceModal open={showJoinWs} onOpenChange={setShowJoinWs} />
        <CreateChannelModal open={showCreateChan} onOpenChange={setShowCreateChan} />
        
        {/* Omni-Command Palette */}
        <CommandPalette />

        {/* Global notifications and confirmation dialogs */}
        <Toaster />
        <ConfirmDialog />
      </div>
    </VoiceCallProvider>
  );
}
