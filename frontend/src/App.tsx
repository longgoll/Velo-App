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
  } = useChatStore();

  // WebSocket connection
  const { sendMessage } = useWebSocket(token);

  // Fetch logged in user data
  useEffect(() => {
    if (token) {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, [token]);

  const handleAuthSuccess = (newToken: string, newUser: UserData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('lastWorkspaceId');
    localStorage.removeItem('lastChannelId');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-200 select-none overflow-hidden">
      {/* 1. Slim Left Navigation Sidebar */}
      <WorkspaceSidebar
        user={user}
        onLogout={handleLogout}
      />

      {/* 2. Fluid Content Explorer Sidebar */}
      <ContentExplorer />

      {/* 3. Main Chat Viewport */}
      <ChatViewport onSendMessage={sendMessage} />

      {/* --- Dialog / Modals --- */}
      <CreateWorkspaceModal open={showCreateWs} onOpenChange={setShowCreateWs} />
      <JoinWorkspaceModal open={showJoinWs} onOpenChange={setShowJoinWs} />
      <CreateChannelModal open={showCreateChan} onOpenChange={setShowCreateChan} />
      
      {/* Omni-Command Palette */}
      <CommandPalette />
    </div>
  );
}
