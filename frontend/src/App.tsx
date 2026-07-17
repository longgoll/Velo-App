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
import IncomingCallDialog from '@/components/ui/IncomingCallDialog';
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

  const [isStreamerMode, setIsStreamerMode] = useState(false);

  const applySettings = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedDarkSidebar = localStorage.getItem('dark_sidebar') === 'true';
    const savedAccentColor = localStorage.getItem('accentColor') || 'indigo';
    const savedStreamerMode = localStorage.getItem('user_streamer_mode') === 'true';

    setIsStreamerMode(savedStreamerMode);

    const root = document.documentElement;

    // Theme class
    root.classList.remove('light', 'dark', 'midnight');
    if (savedTheme === 'light') {
      root.classList.add('light');
    } else if (savedTheme === 'midnight') {
      root.classList.add('midnight');
    } else {
      root.classList.add('dark');
    }

    // Dark Sidebar class
    if (savedDarkSidebar) {
      root.classList.add('dark-sidebar');
    } else {
      root.classList.remove('dark-sidebar');
    }

    // Accent Color class
    root.classList.remove('accent-indigo', 'accent-emerald', 'accent-rose', 'accent-violet');
    root.classList.add(`accent-${savedAccentColor}`);
  };

  useEffect(() => {
    applySettings();
    window.addEventListener('velo-settings-changed', applySettings);
    window.addEventListener('storage', applySettings);
    return () => {
      window.removeEventListener('velo-settings-changed', applySettings);
      window.removeEventListener('storage', applySettings);
    };
  }, []);

  const handleDisableStreamerMode = () => {
    localStorage.setItem('user_streamer_mode', 'false');
    window.dispatchEvent(new Event('velo-settings-changed'));
    toast.success('Đã tắt chế độ Streamer.');
  };

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
      <div className="flex flex-col h-screen select-none overflow-hidden bg-zinc-950 text-zinc-200">
        {/* Streamer Mode active warning banner */}
        {isStreamerMode && (
          <div className="bg-indigo-600 text-white text-[11.5px] py-2 px-4 flex items-center justify-between z-50 shadow-md animate-in slide-in-from-top duration-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
              <span className="font-bold uppercase tracking-wider">Chế độ Streamer đang hoạt động</span>
              <span className="opacity-80">— Các thông tin cá nhân nhạy cảm đã được ẩn tự động để bảo vệ quyền riêng tư của bạn.</span>
            </div>
            <button 
              onClick={handleDisableStreamerMode}
              className="bg-zinc-900/60 hover:bg-zinc-900/80 text-white text-[10px] font-bold px-2 py-1 rounded transition border-0 cursor-pointer outline-none"
            >
              Tắt chế độ Streamer
            </button>
          </div>
        )}

        <div className="flex flex-1 h-full overflow-hidden">
          {/* 1. Slim Left Navigation Sidebar */}
          <WorkspaceSidebar />

          {/* 2. Fluid Content Explorer Sidebar */}
          <ContentExplorer onLogout={handleLogout} />

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
          <IncomingCallDialog />
        </div>
      </div>
    </VoiceCallProvider>
  );
}
