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

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [user, setUser] = useState<UserData | null>(null);

  // Modal open states
  const [showCreateWs, setShowCreateWs] = useState(false);
  const [showJoinWs, setShowJoinWs] = useState(false);
  const [showCreateChan, setShowCreateChan] = useState(false);

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
        onCreateWsClick={() => setShowCreateWs(true)}
        onJoinWsClick={() => setShowJoinWs(true)}
      />

      {/* 2. Fluid Content Explorer Sidebar */}
      <ContentExplorer onCreateChanClick={() => setShowCreateChan(true)} />

      {/* 3. Main Chat Viewport */}
      <ChatViewport onSendMessage={sendMessage} />

      {/* --- Dialog / Modals --- */}
      <CreateWorkspaceModal open={showCreateWs} onOpenChange={setShowCreateWs} />
      <JoinWorkspaceModal open={showJoinWs} onOpenChange={setShowJoinWs} />
      <CreateChannelModal open={showCreateChan} onOpenChange={setShowCreateChan} />
    </div>
  );
}
