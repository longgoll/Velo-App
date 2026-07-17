import { useState, useEffect } from 'react';
import { 
  User, 
  Palette, 
  Volume2, 
  Bell, 
  X,
  Search,
  UserCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

// Import subcomponents
import { AccountTab } from './user-settings/AccountTab';
import { ProfileTab } from './user-settings/ProfileTab';
import { AppearanceTab } from './user-settings/AppearanceTab';
import { VoiceTab } from './user-settings/VoiceTab';
import { NotificationsTab } from './user-settings/NotificationsTab';

interface UserSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => void;
}

type TabType = 'account' | 'profile' | 'appearance' | 'voice' | 'notifications';

export default function UserSettingsModal({
  open,
  onOpenChange,
  onLogout,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [searchQuery, setSearchQuery] = useState('');

  // Retrieve current user from local storage
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Sync streamerMode state to dynamically adjust rendering preview if needed
  const [streamerMode, setStreamerMode] = useState(() => {
    return localStorage.getItem('user_streamer_mode') === 'true';
  });

  const [gradientIndex, setGradientIndex] = useState(0);

  useEffect(() => {
    const handleSync = () => {
      setStreamerMode(localStorage.getItem('user_streamer_mode') === 'true');
    };
    window.addEventListener('velo-settings-changed', handleSync);
    return () => window.removeEventListener('velo-settings-changed', handleSync);
  }, []);

  // Smooth scroll handler for anchor sections within AccountTab
  const handleScrollToId = (id: string) => {
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Sidebar Tabs Config
  const sidebarTabs = [
    { id: 'account', label: 'Tài khoản', icon: User, category: 'Cài đặt người dùng' },
    { id: 'profile', label: 'Hồ sơ', icon: UserCheck, category: 'Cài đặt người dùng' },
    { id: 'appearance', label: 'Giao diện', icon: Palette, category: 'Cài đặt ứng dụng' },
    { id: 'voice', label: 'Âm thanh & Video', icon: Volume2, category: 'Cài đặt ứng dụng' },
    { id: 'notifications', label: 'Thông báo', icon: Bell, category: 'Cài đặt ứng dụng' },
  ] as const;

  // Filter tabs based on search box input
  const filteredTabs = sidebarTabs.filter(tab => 
    tab.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tab.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-4xl w-[95vw] h-[680px] p-0 overflow-hidden flex bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-2xl shadow-2xl">
        
        {/* Floating ESC Close Button */}
        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-6 right-6 flex flex-col items-center gap-1 group z-50 bg-transparent border-0 outline-none cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-400 group-hover:bg-zinc-800 group-hover:text-zinc-200 flex items-center justify-center transition-all duration-150 shadow-lg">
            <X className="w-4 h-4" />
          </div>
          <span className="text-[10px] text-zinc-500 font-bold group-hover:text-zinc-400 transition-colors">ESC</span>
        </button>

        {/* Left Sidebar */}
        <div className="w-[240px] bg-zinc-900/90 border-r border-zinc-800/60 p-4 flex flex-col gap-4 shrink-0 select-none">
          
          {/* User mini profile card in sidebar */}
          <div className="bg-zinc-950/40 border border-zinc-800/40 rounded-xl p-3 flex items-center gap-3">
            <Avatar className="w-9 h-9 border border-zinc-800 shadow-md">
              <AvatarFallback className={`text-xs font-bold text-white ${getAvatarGradient(currentUser?.username || '')}`}>
                {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
              </AvatarFallback>
            </Avatar>
            <div className="text-left min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">{currentUser?.username || 'Người dùng'}</div>
              <button 
                onClick={() => {
                  setActiveTab('account');
                  setTimeout(() => handleScrollToId('account-info'), 100);
                }}
                className="text-[10px] font-semibold text-zinc-500 hover:text-indigo-400 mt-0.5 text-left border-0 bg-transparent p-0 cursor-pointer"
              >
                Sửa hồ sơ
              </button>
            </div>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-zinc-650"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 border-0 bg-transparent cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Tab Navigation List */}
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Group items by category */}
            {['Cài đặt người dùng', 'Cài đặt ứng dụng'].map((category) => {
              const categoryTabs = filteredTabs.filter(t => t.category === category);
              if (categoryTabs.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <div className="text-[10px] font-bold text-zinc-500 px-2.5 uppercase tracking-wider mb-1">
                    {category}
                  </div>
                  {categoryTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <div key={tab.id} className="flex flex-col">
                        <button
                          onClick={() => {
                            setActiveTab(tab.id);
                            if (tab.id === 'account') {
                              setTimeout(() => handleScrollToId('account-info'), 100);
                            }
                          }}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border-0 outline-none ${
                            isActive
                              ? 'bg-zinc-800 text-white font-semibold shadow-sm'
                              : 'text-zinc-400 hover:bg-zinc-850 hover:text-zinc-200'
                          }`}
                        >
                          <Icon className="w-4 h-4 shrink-0" />
                          <span>{tab.label}</span>
                        </button>

                        {/* Anchor sub-menus under "Tài khoản" */}
                        {isActive && tab.id === 'account' && (
                          <div className="pl-6.5 py-1.5 border-l border-zinc-800/80 ml-4.5 mt-0.5 space-y-1.5 text-left flex flex-col">
                            <button
                              onClick={() => handleScrollToId('account-info')}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Thông tin tài khoản
                            </button>
                            <button
                              onClick={() => handleScrollToId('password-security')}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Mật khẩu & Bảo mật
                            </button>
                            <button
                              onClick={() => handleScrollToId('account-status')}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Trạng thái tài khoản
                            </button>
                            <button
                              onClick={() => handleScrollToId('family-center')}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Trung tâm gia đình
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Footer of Sidebar */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/10 hover:bg-red-950/20 text-red-400 hover:text-red-300 border border-red-900/30 rounded-lg text-xs font-semibold transition-colors cursor-pointer outline-none mt-auto"
            >
              Đăng xuất
            </button>
          )}
        </div>

        {/* Right Scrollable Content Area */}
        <div className="flex-1 bg-zinc-950 flex flex-col min-w-0 h-full overflow-y-auto p-8 pr-16 text-left">
          
          {activeTab === 'account' && (
            <AccountTab 
              currentUser={currentUser} 
              streamerMode={streamerMode} 
              onLogout={onLogout} 
              onCloseSettings={() => onOpenChange(false)}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileTab 
              currentUser={currentUser} 
              streamerMode={streamerMode} 
              gradientIndex={gradientIndex}
              setGradientIndex={setGradientIndex}
            />
          )}

          {activeTab === 'appearance' && <AppearanceTab />}

          {activeTab === 'voice' && <VoiceTab />}

          {activeTab === 'notifications' && <NotificationsTab />}

          {/* Dialog Footer Version Info */}
          <div className="mt-auto pt-6 border-t border-zinc-800/40 flex justify-between items-center text-[10px] text-zinc-650 font-medium">
            <span>Bản dựng Velo v1.2.0 • Kênh thử nghiệm Alpha</span>
            <span>Thiết kế lấy cảm hứng từ Discord UI</span>
          </div>

        </div>

      </DialogContent>
    </Dialog>
  );
}
