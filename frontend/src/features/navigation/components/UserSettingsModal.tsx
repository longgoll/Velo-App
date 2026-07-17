import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Palette, 
  Volume2, 
  Bell, 
  Settings, 
  Shield, 
  Key, 
  Info,
  X,
  Search,
  Check,
  Eye,
  EyeOff,
  Copy,
  Laptop,
  Smartphone,
  CheckCircle2,
  Trash2,
  QrCode,
  ShieldCheck,
  Mic,
  Monitor,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import { toast } from '@/store/useToastStore';

interface UserSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogout?: () => void;
}

type TabType = 'account' | 'profile' | 'appearance' | 'voice' | 'notifications';

// Custom toggle switch component
const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (val: boolean) => void }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`w-10 h-6 flex items-center rounded-full p-1 transition-all duration-200 outline-none border-0 cursor-pointer ${
      checked ? 'bg-indigo-600' : 'bg-zinc-800'
    }`}
  >
    <div
      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

export default function UserSettingsModal({
  open,
  onOpenChange,
  onLogout,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account');
  const [searchQuery, setSearchQuery] = useState('');

  // Refs for scrolling to sections
  const accountInfoRef = useRef<HTMLDivElement>(null);
  const passwordSecurityRef = useRef<HTMLDivElement>(null);
  const accountStatusRef = useRef<HTMLDivElement>(null);
  const familyCenterRef = useRef<HTMLDivElement>(null);

  // Retrieve current user from local storage
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Form edit states
  const [editingField, setEditingField] = useState<'username' | 'email' | 'phone' | 'password' | null>(null);
  const [usernameVal, setUsernameVal] = useState(currentUser?.username || '');
  const [emailVal, setEmailVal] = useState(currentUser?.email || '');
  const [phoneVal, setPhoneVal] = useState(() => {
    return localStorage.getItem('user_phone') || '0987654321';
  });

  // Mask / show toggles
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  // Password fields
  const [passwordFields, setPasswordFields] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  // 2FA Wizard states
  const [show2FA, setShow2FA] = useState(false);
  const [mfaStep, setMfaStep] = useState<1 | 2 | 3>(1);
  const [mfaCode, setMfaCode] = useState('');
  const [is2FAEnabled, setIs2FAEnabled] = useState(() => {
    return localStorage.getItem('user_2fa') === 'true';
  });

  // Logged-in devices mock list
  const [devices, setDevices] = useState([
    { id: 'dev-1', name: 'Chrome on Windows 11', location: 'Hà Nội, Việt Nam', isCurrent: true, time: 'Đang hoạt động', icon: Monitor },
    { id: 'dev-2', name: 'iOS App (iPhone 15 Pro)', location: 'TP. Hồ Chí Minh, Việt Nam', isCurrent: false, time: '2 giờ trước', icon: Smartphone },
    { id: 'dev-3', name: 'Desktop Client (macOS)', location: 'Đà Nẵng, Việt Nam', isCurrent: false, time: 'Hôm qua', icon: Laptop },
    { id: 'dev-4', name: 'Firefox on Linux Ubuntu', location: 'Hà Nội, Việt Nam', isCurrent: false, time: '3 ngày trước', icon: Monitor },
  ]);

  // Profile styling customizer
  const [gradientIndex, setGradientIndex] = useState(0);

  // Appearance customizer
  const [appTheme, setAppTheme] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem('accentColor') || 'indigo';
  });
  const [darkSidebar, setDarkSidebar] = useState(() => {
    return localStorage.getItem('dark_sidebar') === 'true';
  });
  const [autoEmote, setAutoEmote] = useState(() => {
    return localStorage.getItem('chat_auto_emote') !== 'false';
  });
  const [showSendButton, setShowSendButton] = useState(() => {
    return localStorage.getItem('chat_show_send_button') !== 'false';
  });
  const [streamerMode, setStreamerMode] = useState(() => {
    return localStorage.getItem('user_streamer_mode') === 'true';
  });

  useEffect(() => {
    const handleSync = () => {
      setStreamerMode(localStorage.getItem('user_streamer_mode') === 'true');
      setAppTheme(localStorage.getItem('theme') || 'dark');
      setDarkSidebar(localStorage.getItem('dark_sidebar') === 'true');
      setAccentColor(localStorage.getItem('accentColor') || 'indigo');
    };
    window.addEventListener('velo-settings-changed', handleSync);
    return () => window.removeEventListener('velo-settings-changed', handleSync);
  }, []);

  const toggleDarkSidebar = (checked: boolean) => {
    setDarkSidebar(checked);
    localStorage.setItem('dark_sidebar', String(checked));
    window.dispatchEvent(new Event('velo-settings-changed'));
  };

  const toggleAutoEmote = (checked: boolean) => {
    setAutoEmote(checked);
    localStorage.setItem('chat_auto_emote', String(checked));
    window.dispatchEvent(new Event('velo-settings-changed'));
  };

  const toggleShowSendButton = (checked: boolean) => {
    setShowSendButton(checked);
    localStorage.setItem('chat_show_send_button', String(checked));
    window.dispatchEvent(new Event('velo-settings-changed'));
  };

  const toggleStreamerMode = (checked: boolean) => {
    setStreamerMode(checked);
    localStorage.setItem('user_streamer_mode', String(checked));
    window.dispatchEvent(new Event('velo-settings-changed'));
    if (checked) {
      toast.success('Chế độ Streamer đã được bật!');
    } else {
      toast.success('Chế độ Streamer đã được tắt.');
    }
  };

  // Voice configurations
  const [inputs, setInputs] = useState<MediaDeviceInfo[]>([]);
  const [outputs, setOutputs] = useState<MediaDeviceInfo[]>([]);
  const [selectedInput, setSelectedInput] = useState('');
  const [selectedOutput, setSelectedOutput] = useState('');
  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  // Notifications states
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [unreadBadges, setUnreadBadges] = useState(true);
  const [soundCues, setSoundCues] = useState(true);

  // Enumerate hardware devices
  useEffect(() => {
    if (!open) return;
    const fetchDevices = async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const mics = list.filter(d => d.kind === 'audioinput');
        const speakers = list.filter(d => d.kind === 'audiooutput');
        setInputs(mics);
        setOutputs(speakers);
        if (mics.length > 0 && !selectedInput) setSelectedInput(mics[0].deviceId);
        if (speakers.length > 0 && !selectedOutput) setSelectedOutput(speakers[0].deviceId);
      } catch (err) {
        console.warn('Cannot query media devices:', err);
      }
    };
    fetchDevices();
  }, [open]);

  // Simulate Mic volume feedback
  useEffect(() => {
    let intervalId: any;
    if (isTestingMic) {
      intervalId = setInterval(() => {
        // Randomly simulate vocal activity peaks
        setMicVolume(Math.floor(Math.random() * 85) + 15);
      }, 100);
    } else {
      setMicVolume(0);
    }
    return () => clearInterval(intervalId);
  }, [isTestingMic]);

  // Smooth scroll handler for anchor sections
  const handleScrollTo = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Helper to obfuscate email
  const getObfuscatedEmail = (emailStr: string) => {
    if (!emailStr) return '';
    const parts = emailStr.split('@');
    if (parts.length < 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 3) return `***@${domain}`;
    return `${name.slice(0, 3)}***@${domain}`;
  };

  // Helper to obfuscate phone
  const getObfuscatedPhone = (phoneStr: string) => {
    if (!phoneStr) return '';
    if (phoneStr.length < 4) return '***';
    return `${phoneStr.slice(0, 2)}******${phoneStr.slice(-2)}`;
  };

  // Profile save handlers
  const handleSaveUsername = () => {
    if (!usernameVal.trim()) {
      toast.error('Tên đăng nhập không được bỏ trống.');
      return;
    }
    const updatedUser = { ...currentUser, username: usernameVal };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    toast.success('Đã thay đổi tên đăng nhập thành công!');
    setEditingField(null);
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleSaveEmail = () => {
    if (!emailVal.trim() || !emailVal.includes('@')) {
      toast.error('Email không hợp lệ.');
      return;
    }
    const updatedUser = { ...currentUser, email: emailVal };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    toast.success('Đã cập nhật địa chỉ Email!');
    setEditingField(null);
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleSavePhone = () => {
    if (!phoneVal.trim() || phoneVal.length < 8) {
      toast.error('Số điện thoại không hợp lệ.');
      return;
    }
    localStorage.setItem('user_phone', phoneVal);
    toast.success('Đã liên kết số điện thoại!');
    setEditingField(null);
  };

  const handleSavePassword = () => {
    if (!passwordFields.current || !passwordFields.new || !passwordFields.confirm) {
      toast.error('Vui lòng điền đầy đủ thông tin mật khẩu.');
      return;
    }
    if (passwordFields.new.length < 6) {
      toast.error('Mật khẩu mới phải từ 6 ký tự trở lên.');
      return;
    }
    if (passwordFields.new !== passwordFields.confirm) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }
    toast.success('Đổi mật khẩu thành công!');
    setEditingField(null);
    setPasswordFields({ current: '', new: '', confirm: '' });
  };

  // Revoke device session
  const handleRevokeDevice = (id: string) => {
    setDevices(devices.filter(d => d.id !== id));
    toast.success('Đã ngắt kết nối thiết bị!');
  };

  // Simulated 2FA validation
  const handleEnable2FA = () => {
    if (mfaCode.length !== 6 || isNaN(Number(mfaCode))) {
      toast.error('Mã xác nhận 2FA phải là 6 chữ số.');
      return;
    }
    setIs2FAEnabled(true);
    localStorage.setItem('user_2fa', 'true');
    setMfaStep(3);
    toast.success('Đã kích hoạt xác thực hai yếu tố (2FA)!');
  };

  const handleDisable2FA = () => {
    setIs2FAEnabled(false);
    localStorage.setItem('user_2fa', 'false');
    setMfaStep(1);
    setShow2FA(false);
    toast.success('Đã tắt xác thực hai yếu tố.');
  };

  // Change primary themes
  const changeTheme = (themeName: string) => {
    setAppTheme(themeName);
    localStorage.setItem('theme', themeName);
    window.dispatchEvent(new Event('velo-settings-changed'));
    toast.success(`Đã đổi chủ đề sang: ${themeName === 'light' ? 'Sáng' : themeName === 'midnight' ? 'Midnight' : 'Tối'}`);
  };

  // Change Accent Colors
  const changeAccent = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('accentColor', color);
    window.dispatchEvent(new Event('velo-settings-changed'));
    toast.success(`Đã đổi màu chủ đạo sang: ${color}`);
  };

  // Deactivate/Delete Account simulator
  const handleDeactivateAccount = () => {
    if (confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản của mình? Bạn có thể kích hoạt lại bất kỳ lúc nào.')) {
      toast.info('Tài khoản đã được vô hiệu hóa. Đang đăng xuất...');
      setTimeout(() => {
        if (onLogout) onLogout();
        onOpenChange(false);
      }, 1500);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn tài khoản của bạn và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?')) {
      toast.error('Đang tiến hành xóa tài khoản của bạn. Hẹn gặp lại!');
      setTimeout(() => {
        if (onLogout) onLogout();
        onOpenChange(false);
      }, 2000);
    }
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
                onClick={() => setActiveTab('account')}
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
                              // Scroll to top of account
                              setTimeout(() => handleScrollTo(accountInfoRef), 100);
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
                              onClick={() => handleScrollTo(accountInfoRef)}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Thông tin tài khoản
                            </button>
                            <button
                              onClick={() => handleScrollTo(passwordSecurityRef)}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Mật khẩu & Bảo mật
                            </button>
                            <button
                              onClick={() => handleScrollTo(accountStatusRef)}
                              className="text-[11px] text-zinc-450 hover:text-zinc-200 transition-colors border-0 bg-transparent p-0 cursor-pointer text-left"
                            >
                              Trạng thái tài khoản
                            </button>
                            <button
                              onClick={() => handleScrollTo(familyCenterRef)}
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
          
          {/* ======================= TAB: ACCOUNT ======================= */}
          {activeTab === 'account' && (
            <div className="space-y-8 pb-10">
              
              {/* Account Title */}
              <div>
                <h3 className="text-xl font-bold text-white">Tài khoản</h3>
                <p className="text-xs text-zinc-400 mt-1">Quản lý và cập nhật thông tin cá nhân của bạn.</p>
              </div>

              {/* CARD 1: THÔNG TIN TÀI KHOẢN */}
              <div ref={accountInfoRef} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-5 scroll-mt-6">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Thông tin tài khoản</span>
                </div>

                <div className="space-y-4">
                  {/* Row 1: Username */}
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/30">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-zinc-550 uppercase">Tên đăng nhập</div>
                      {editingField === 'username' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={usernameVal}
                            onChange={(e) => setUsernameVal(e.target.value)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500 w-[180px]"
                          />
                          <Button size="icon-sm" className="bg-indigo-600 hover:bg-indigo-500 border-0" onClick={handleSaveUsername}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" className="border-0 hover:bg-zinc-850" onClick={() => setEditingField(null)}>
                            <X className="w-3.5 h-3.5 text-zinc-400" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-white">
                          {streamerMode ? '• • • • • • • • • •' : (currentUser?.username || 'Người dùng')}
                        </div>
                      )}
                    </div>
                    {editingField !== 'username' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setUsernameVal(currentUser?.username || '');
                          setEditingField('username');
                        }}
                        disabled={streamerMode}
                        className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border-0 disabled:opacity-50"
                      >
                        Chỉnh sửa
                      </Button>
                    )}
                  </div>

                  {/* Row 2: Email */}
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/30">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-zinc-550 uppercase">Email</div>
                      {editingField === 'email' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="email"
                            value={emailVal}
                            onChange={(e) => setEmailVal(e.target.value)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500 w-[220px]"
                          />
                          <Button size="icon-sm" className="bg-indigo-600 hover:bg-indigo-500 border-0" onClick={handleSaveEmail}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" className="border-0 hover:bg-zinc-850" onClick={() => setEditingField(null)}>
                            <X className="w-3.5 h-3.5 text-zinc-400" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>
                            {streamerMode 
                              ? '• • • • • • • • • •' 
                              : showEmail 
                                ? (currentUser?.email || 'Chưa thiết lập') 
                                : getObfuscatedEmail(currentUser?.email || '')
                            }
                          </span>
                          {!streamerMode && (
                            <button 
                              onClick={() => setShowEmail(!showEmail)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-355 cursor-pointer border-0 bg-transparent p-0"
                            >
                              {showEmail ? 'Ẩn' : 'Hiển thị'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {editingField !== 'email' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setEmailVal(currentUser?.email || '');
                          setEditingField('email');
                        }}
                        disabled={streamerMode}
                        className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border-0 disabled:opacity-50"
                      >
                        Chỉnh sửa
                      </Button>
                    )}
                  </div>

                  {/* Row 3: Phone */}
                  <div className="flex items-center justify-between py-1.5">
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-zinc-550 uppercase">Số Điện Thoại</div>
                      {editingField === 'phone' ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            value={phoneVal}
                            onChange={(e) => setPhoneVal(e.target.value)}
                            className="px-2 py-1 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500 w-[180px]"
                          />
                          <Button size="icon-sm" className="bg-indigo-600 hover:bg-indigo-500 border-0" onClick={handleSavePhone}>
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" className="border-0 hover:bg-zinc-850" onClick={() => setEditingField(null)}>
                            <X className="w-3.5 h-3.5 text-zinc-400" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-sm font-semibold text-white flex items-center gap-2">
                          <span>
                            {streamerMode 
                              ? '• • • • • • • • • •' 
                              : showPhone 
                                ? phoneVal 
                                : getObfuscatedPhone(phoneVal)
                            }
                          </span>
                          {!streamerMode && (
                            <button 
                              onClick={() => setShowPhone(!showPhone)}
                              className="text-[10px] font-bold text-indigo-400 hover:text-indigo-355 cursor-pointer border-0 bg-transparent p-0"
                            >
                              {showPhone ? 'Ẩn' : 'Hiển thị'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    {editingField !== 'phone' && (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setEditingField('phone');
                        }}
                        disabled={streamerMode}
                        className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border-0 disabled:opacity-50"
                      >
                        Chỉnh sửa
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: MẬT KHẨU & BẢO MẬT */}
              <div ref={passwordSecurityRef} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-6 scroll-mt-6">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mật khẩu & Bảo mật</span>
                </div>

                {/* Password Row */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-white">Mật khẩu</div>
                      <div className="text-[11px] text-zinc-400">Thay đổi mật khẩu đăng nhập định kỳ để tối ưu hóa an toàn.</div>
                    </div>
                    {editingField !== 'password' && (
                      <Button 
                        size="sm" 
                        onClick={() => setEditingField('password')}
                        className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border-0"
                      >
                        Đổi mật khẩu
                      </Button>
                    )}
                  </div>

                  {editingField === 'password' && (
                    <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-850 space-y-3.5 w-full animate-in fade-in duration-200 text-left">
                      <div className="text-xs font-bold text-zinc-300">Đổi mật khẩu</div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-550 uppercase">Mật khẩu hiện tại</label>
                          <input
                            type="password"
                            value={passwordFields.current}
                            onChange={(e) => setPasswordFields({ ...passwordFields, current: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-550 uppercase">Mật khẩu mới</label>
                          <input
                            type="password"
                            value={passwordFields.new}
                            onChange={(e) => setPasswordFields({ ...passwordFields, new: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-zinc-550 uppercase">Xác nhận mật khẩu</label>
                          <input
                            type="password"
                            value={passwordFields.confirm}
                            onChange={(e) => setPasswordFields({ ...passwordFields, confirm: e.target.value })}
                            className="w-full px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-zinc-900/60">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setEditingField(null);
                            setPasswordFields({ current: '', new: '', confirm: '' });
                          }}
                          className="text-xs border-0 hover:bg-zinc-850"
                        >
                          Hủy
                        </Button>
                        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs border-0" onClick={handleSavePassword}>
                          Lưu mật khẩu
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Multi-Factor Authentication (2FA) */}
                <div className="border-t border-zinc-800/40 pt-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-bold text-white flex items-center gap-1.5">
                        Xác Thực Đa Nhân Tố (2FA)
                        {is2FAEnabled && (
                          <span className="text-[9px] bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1">
                            <Shield className="w-2.5 h-2.5" /> ĐÃ BẬT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        Bảo vệ tài khoản tối đa bằng cách yêu cầu mã xác thực OTP từ điện thoại khi đăng nhập.
                      </div>
                    </div>
                    {is2FAEnabled ? (
                      <Button 
                        size="sm" 
                        onClick={handleDisable2FA}
                        className="bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 border border-rose-900/30 text-xs font-semibold"
                      >
                        Vô hiệu hóa 2FA
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setShow2FA(true);
                          setMfaStep(1);
                          setMfaCode('');
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-xs text-white border-0"
                      >
                        Thiết lập 2FA
                      </Button>
                    )}
                  </div>

                  {/* 2FA SETUP WIZARD OVERLAY PANEL */}
                  {show2FA && (
                    <div className="p-5 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                        <span className="text-xs font-bold text-white">Thiết lập Xác thực 2 yếu tố</span>
                        <button onClick={() => setShow2FA(false)} className="text-zinc-500 hover:text-zinc-300 border-0 bg-transparent cursor-pointer">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {mfaStep === 1 && (
                        <div className="flex flex-col md:flex-row gap-5 items-center">
                          <div className="p-3 bg-white rounded-lg shrink-0 shadow-lg">
                            <QrCode className="w-28 h-28 text-black" />
                          </div>
                          <div className="space-y-2 text-left flex-1">
                            <h4 className="text-xs font-bold text-zinc-300">Bước 1: Quét mã QR</h4>
                            <p className="text-[11px] text-zinc-450 leading-relaxed">
                              Sử dụng ứng dụng xác thực (Google Authenticator hoặc Authy) trên điện thoại để quét mã QR bên cạnh.
                            </p>
                            <div className="pt-2">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Mã khóa dự phòng</span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-xs bg-zinc-900 border border-zinc-850 px-2 py-1 rounded font-bold text-indigo-400">VELO-2FA-7X9Y-3K4P</span>
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText('VELO-2FA-7X9Y-3K4P');
                                    toast.success('Đã sao chép khóa dự phòng!');
                                  }}
                                  className="p-1 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:text-zinc-200 text-zinc-400 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <div className="pt-2 flex justify-end">
                              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs border-0" onClick={() => setMfaStep(2)}>
                                Tiếp theo
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {mfaStep === 2 && (
                        <div className="space-y-3.5 max-w-sm">
                          <h4 className="text-xs font-bold text-zinc-300">Bước 2: Nhập mã xác minh</h4>
                          <p className="text-[11px] text-zinc-450">
                            Nhập mã xác thực gồm 6 chữ số được tạo từ ứng dụng di động của bạn để hoàn tất thiết lập.
                          </p>
                          <div className="space-y-1">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="000 000"
                              value={mfaCode}
                              onChange={(e) => setMfaCode(e.target.value)}
                              className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-center font-bold text-base tracking-widest text-white w-full focus:outline-none focus:border-indigo-500 placeholder:text-zinc-650"
                            />
                          </div>
                          <div className="flex justify-end gap-2 pt-2">
                            <Button size="sm" variant="ghost" className="text-xs border-0 hover:bg-zinc-850" onClick={() => setMfaStep(1)}>Quay lại</Button>
                            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-xs border-0" onClick={handleEnable2FA}>Xác nhận & Bật</Button>
                          </div>
                        </div>
                      )}

                      {mfaStep === 3 && (
                        <div className="text-center py-4 flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-emerald-950/60 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center">
                            <ShieldCheck className="w-7 h-7" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-white">Xác thực 2 yếu tố đã được bật!</h4>
                            <p className="text-xs text-zinc-400 max-w-xs leading-relaxed">
                              Tài khoản của bạn giờ đây đã được bảo vệ tối đa. Hãy lưu giữ mã dự phòng an toàn.
                            </p>
                          </div>
                          <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-xs mt-1 border-0" onClick={() => setShow2FA(false)}>
                            Hoàn tất
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Sessions Device List */}
                <div className="border-t border-zinc-800/40 pt-4 space-y-4">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white">Thiết Bị Đã Đăng Nhập</div>
                    <div className="text-[11px] text-zinc-450">Quản lý và giám sát danh sách các phiên đăng nhập đang hoạt động.</div>
                  </div>

                  <div className="space-y-2">
                    {devices.map((device) => {
                      const DeviceIcon = device.icon;
                      return (
                        <div key={device.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-850/60">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-400">
                              <DeviceIcon className="w-4 h-4" />
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {device.name}
                                {device.isCurrent && (
                                  <span className="text-[8px] font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-500/10 px-1.5 py-0.5 rounded">Hiện tại</span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 mt-0.5">{streamerMode ? '• • • • • • • •' : `${device.location} • ${device.time}`}</div>
                            </div>
                          </div>

                          {!device.isCurrent && (
                            <button
                              onClick={() => handleRevokeDevice(device.id)}
                              className="p-1.5 rounded-lg hover:bg-red-950/20 text-zinc-500 hover:text-red-400 transition-colors border-0 bg-transparent cursor-pointer"
                              title="Ngắt kết nối phiên"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* CARD 3: TRẠNG THÁI TÀI KHOẢN */}
              <div ref={accountStatusRef} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 scroll-mt-6">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trạng thái tài khoản</span>
                </div>

                <div className="flex items-start gap-4 p-4 bg-emerald-950/25 border border-emerald-500/10 rounded-xl text-left">
                  <div className="p-1.5 bg-emerald-900/20 border border-emerald-500/20 rounded-full text-emerald-400 mt-0.5">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white">Tài khoản của bạn hoàn toàn ổn</h4>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Cám ơn vì đã tuân thủ Điều khoản Dịch vụ và Nguyên tắc Cộng đồng của Velo. Nếu có bất kỳ vi phạm hay báo cáo liên quan đến tài khoản, thông tin cảnh báo chi tiết sẽ được cập nhật tại đây.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD 4: TRUNG TÂM GIA ĐÌNH */}
              <div ref={familyCenterRef} className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 scroll-mt-6">
                <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Trung tâm gia đình</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <div className="text-sm font-bold text-white">Giám sát hoạt động gia đình</div>
                    <p className="text-[11px] text-zinc-400 max-w-md leading-relaxed">
                      Kết nối tài khoản của cha mẹ và thanh thiếu niên để xem các báo cáo tóm tắt về hoạt động trò chuyện mà không vi phạm quyền riêng tư tin nhắn.
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => toast.info('Tính năng Trung tâm gia đình đang được hoàn thiện!')}
                    className="bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 border-0 flex items-center gap-1 shrink-0"
                  >
                    Thiết lập <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* CARD 5: DISABLE / DELETE ACCOUNT */}
              <div className="border-t border-zinc-800/40 pt-6 space-y-4">
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-left">Xử lý tài khoản</div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-zinc-900/40 border border-zinc-800 rounded-xl">
                  <div className="space-y-0.5 text-left">
                    <div className="text-sm font-bold text-white">Vô hiệu hóa tài khoản</div>
                    <p className="text-[11px] text-zinc-450">Tạm thời khóa tài khoản. Bạn có thể đăng nhập lại bất kỳ lúc nào để khôi phục.</p>
                  </div>
                  <Button 
                    onClick={handleDeactivateAccount}
                    className="bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 border-0"
                  >
                    Vô hiệu hóa tài khoản
                  </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-red-955/5 border border-red-500/10 rounded-xl">
                  <div className="space-y-0.5 text-left">
                    <div className="text-sm font-bold text-rose-450">Xóa tài khoản vĩnh viễn</div>
                    <p className="text-[11px] text-zinc-450">Thao tác này sẽ xóa toàn bộ tin nhắn, tài khoản của bạn và không thể phục hồi.</p>
                  </div>
                  <Button 
                    onClick={handleDeleteAccount}
                    className="bg-red-600 hover:bg-red-550 text-xs text-white border-0"
                  >
                    Xóa tài khoản
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* ======================= TAB: PROFILE ======================= */}
          {activeTab === 'profile' && (
            <div className="space-y-6 pb-10">
              <div>
                <h3 className="text-xl font-bold text-white">Hồ sơ người dùng</h3>
                <p className="text-xs text-zinc-400 mt-1">Tùy biến hiển thị ảnh đại diện và phong cách cá nhân của bạn.</p>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center md:items-start">
                
                {/* Customizer options */}
                <div className="flex-1 space-y-6 w-full text-left">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300">Tông màu ảnh đại diện mặc định</label>
                    <p className="text-[11px] text-zinc-450">Hệ thống tự động sinh dải màu gradient dựa trên mã tên. Bạn có thể chọn phong cách dải màu mình thích nhất:</p>
                    
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {[
                        { name: 'Indigo & Purple', style: 'bg-gradient-to-br from-indigo-500 to-purple-600' },
                        { name: 'Emerald & Teal', style: 'bg-gradient-to-br from-emerald-400 to-teal-600' },
                        { name: 'Rose & Red', style: 'bg-gradient-to-br from-rose-500 to-red-600' },
                        { name: 'Amber & Orange', style: 'bg-gradient-to-br from-amber-400 to-orange-600' },
                        { name: 'Cyan & Blue', style: 'bg-gradient-to-br from-cyan-500 to-blue-600' },
                        { name: 'Fuchsia & Pink', style: 'bg-gradient-to-br from-fuchsia-500 to-pink-600' },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setGradientIndex(idx);
                            toast.success(`Đã chọn phong cách màu: ${item.name}`);
                          }}
                          className={`flex items-center gap-2 p-2 bg-zinc-950 border rounded-lg transition text-left cursor-pointer outline-none ${
                            gradientIndex === idx ? 'border-indigo-500 bg-zinc-900 shadow-sm' : 'border-zinc-800 hover:border-zinc-700'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full ${item.style} shrink-0`} />
                          <span className="text-[10px] text-zinc-300 font-medium truncate">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-zinc-800 pt-5 space-y-3">
                    <label className="text-xs font-bold text-zinc-300">Tải ảnh đại diện tự chọn</label>
                    <div className="flex items-center gap-3">
                      <Button size="sm" onClick={() => toast.info('Tính năng tải ảnh đại diện lên đang được xây dựng!')} className="bg-indigo-600 hover:bg-indigo-500 text-xs border-0">
                        Tải ảnh lên
                      </Button>
                      <span className="text-[10px] text-zinc-500">Hỗ trợ các định dạng PNG, JPG, GIF (Tối đa 5MB)</span>
                    </div>
                  </div>
                </div>

                {/* Profile Live Preview */}
                <div className="w-[260px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shrink-0 shadow-lg select-none">
                  {/* Decorative Banner */}
                  <div className={`h-[80px] bg-gradient-to-r ${
                    gradientIndex === 0 ? 'from-indigo-500 to-purple-600' :
                    gradientIndex === 1 ? 'from-emerald-400 to-teal-600' :
                    gradientIndex === 2 ? 'from-rose-500 to-red-600' :
                    gradientIndex === 3 ? 'from-amber-400 to-orange-600' :
                    gradientIndex === 4 ? 'from-cyan-500 to-blue-600' :
                    'from-fuchsia-500 to-pink-600'
                  }`} />
                  
                  {/* Preview avatar */}
                  <div className="px-4 pb-4 text-left relative -mt-8">
                    <div className="relative inline-block">
                      <Avatar className="w-16 h-16 border-4 border-zinc-950 shadow-md">
                        <AvatarFallback className={`text-base font-bold text-white bg-gradient-to-br ${
                          gradientIndex === 0 ? 'from-indigo-500 to-purple-600' :
                          gradientIndex === 1 ? 'from-emerald-400 to-teal-600' :
                          gradientIndex === 2 ? 'from-rose-500 to-red-600' :
                          gradientIndex === 3 ? 'from-amber-400 to-orange-600' :
                          gradientIndex === 4 ? 'from-cyan-500 to-blue-600' :
                          'from-fuchsia-500 to-pink-600'
                        }`}>
                          {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 bg-emerald-500" />
                    </div>

                    <div className="mt-3 bg-zinc-900 border border-zinc-800/40 rounded-xl p-3 space-y-2">
                      <div>
                        <div className="text-sm font-bold text-white">{currentUser?.username || 'Người dùng'}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {streamerMode ? '• • • • • • • •' : (currentUser?.id?.slice(0, 10) || '12345678') + '...'}</div>
                      </div>
                      <div className="border-t border-zinc-800/60 pt-2 text-[10.5px] text-zinc-400 leading-relaxed italic">
                        "Phong cách sống và trò chuyện đỉnh cao trên hệ thống Velo."
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ======================= TAB: APPEARANCE ======================= */}
          {activeTab === 'appearance' && (
            <div className="space-y-8 pb-10">
              <div>
                <h3 className="text-xl font-bold text-white">Giao diện & Hiển thị</h3>
                <p className="text-xs text-zinc-400 mt-1">Thay đổi chủ đề hiển thị, màu sắc chủ đạo và cấu hình trò chuyện của ứng dụng.</p>
              </div>

              {/* Theme Customizer Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Chủ đề ứng dụng (Background)</label>
                  <p className="text-[11px] text-zinc-400">Chọn phong cách chủ đề phù hợp với thị giác của bạn.</p>
                </div>

                <div className="grid grid-cols-3 gap-3.5">
                  {/* Theme item: Tối */}
                  <button
                    onClick={() => changeTheme('dark')}
                    className={`flex flex-col gap-2 p-3 bg-zinc-950 border rounded-xl cursor-pointer text-left focus:outline-none transition ${
                      appTheme === 'dark' ? 'border-indigo-500 ring-2 ring-indigo-500/25' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-full h-[55px] bg-zinc-900 border border-zinc-800 rounded-lg flex items-center px-2 gap-2">
                      <div className="w-4 h-4 rounded-full bg-zinc-950" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2 w-16 bg-zinc-850 rounded" />
                        <div className="h-1.5 w-10 bg-zinc-850 rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white text-center w-full block">Chế độ Tối (Dark)</span>
                  </button>

                  {/* Theme item: Midnight */}
                  <button
                    onClick={() => changeTheme('midnight')}
                    className={`flex flex-col gap-2 p-3 bg-zinc-950 border rounded-xl cursor-pointer text-left focus:outline-none transition ${
                      appTheme === 'midnight' ? 'border-indigo-500 ring-2 ring-indigo-500/25' : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-full h-[55px] bg-black border border-zinc-905 rounded-lg flex items-center px-2 gap-2">
                      <div className="w-4 h-4 rounded-full bg-indigo-950/20 border border-indigo-900" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2 w-16 bg-zinc-900 rounded" />
                        <div className="h-1.5 w-10 bg-zinc-900 rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-white text-center w-full block">Midnight (OLED Black)</span>
                  </button>

                  {/* Theme item: Sáng */}
                  <button
                    onClick={() => changeTheme('light')}
                    className={`flex flex-col gap-2 p-3 bg-white border rounded-xl cursor-pointer text-left focus:outline-none transition ${
                      appTheme === 'light' ? 'border-indigo-500 ring-2 ring-indigo-500/25' : 'border-zinc-200 hover:border-zinc-300'
                    }`}
                  >
                    <div className="w-full h-[55px] bg-zinc-50 border border-zinc-200 rounded-lg flex items-center px-2 gap-2">
                      <div className="w-4 h-4 rounded-full bg-white border border-zinc-300" />
                      <div className="space-y-1.5 flex-1">
                        <div className="h-2 w-16 bg-zinc-200 rounded" />
                        <div className="h-1.5 w-10 bg-zinc-200 rounded" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-zinc-800 text-center w-full block">Chế độ Sáng (Light)</span>
                  </button>
                </div>

                {/* Dark Sidebar option (visible if light theme) */}
                {appTheme === 'light' && (
                  <div className="border-t border-zinc-850 pt-5 flex items-center justify-between animate-in fade-in duration-200">
                    <div className="space-y-0.5">
                      <label className="text-xs font-bold text-zinc-300">Thanh bên tối màu (Dark Sidebar)</label>
                      <p className="text-[11px] text-zinc-400">Giữ cho thanh bên trái luôn ở chế độ tối ngay cả khi đang dùng chủ đề Sáng.</p>
                    </div>
                    <ToggleSwitch checked={darkSidebar} onChange={toggleDarkSidebar} />
                  </div>
                )}
              </div>

              {/* Accent Color Selection */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Màu sắc chủ đạo (Accent Color)</label>
                  <p className="text-[11px] text-zinc-400">Chọn tông màu phản hồi cho nút nhấn, biểu tượng hoạt động và các vùng nổi bật.</p>
                </div>

                <div className="flex gap-4">
                  {[
                    { id: 'indigo', name: 'Indigo Blue', color: 'bg-indigo-600 border-indigo-400' },
                    { id: 'emerald', name: 'Emerald Green', color: 'bg-emerald-500 border-emerald-400' },
                    { id: 'rose', name: 'Rose Red', color: 'bg-rose-500 border-rose-400' },
                    { id: 'violet', name: 'Violet Purple', color: 'bg-violet-600 border-violet-400' },
                  ].map((color) => (
                    <button
                      key={color.id}
                      onClick={() => changeAccent(color.id)}
                      className={`flex items-center gap-2 px-3 py-2 bg-zinc-950 border rounded-lg transition-colors cursor-pointer outline-none ${
                        accentColor === color.id ? 'border-white text-white font-semibold' : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      <div className={`w-3.5 h-3.5 rounded-full ${color.color} border shrink-0`} />
                      <span className="text-xs">{color.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Message & Chat Settings */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Tin nhắn & Khung chat</label>
                  <p className="text-[11px] text-zinc-400">Cấu hình hành vi hiển thị và tương tác của khung nhập tin nhắn.</p>
                </div>

                <div className="space-y-5">
                  {/* Auto Emote transformation */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">Tự động chuyển đổi ký tự thành Emoji</div>
                      <p className="text-[11px] text-zinc-450">Tự động biến đổi các ký tự cảm xúc như <code>:)</code> thành <code>🙂</code> khi gõ tin nhắn.</p>
                    </div>
                    <ToggleSwitch checked={autoEmote} onChange={toggleAutoEmote} />
                  </div>

                  {/* Show send button */}
                  <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">Hiển thị nút Gửi tin nhắn</div>
                      <p className="text-[11px] text-zinc-450">Hiển thị nút Gửi dạng icon mũi tên bên cạnh ô nhập tin nhắn trong khung chat.</p>
                    </div>
                    <ToggleSwitch checked={showSendButton} onChange={toggleShowSendButton} />
                  </div>
                </div>
              </div>

              {/* Streamer Mode setting */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
                <div className="flex items-center justify-between">
                  <div className="space-y-1 max-w-md">
                    <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      Chế độ Streamer (Streamer Mode)
                      {streamerMode && (
                        <span className="text-[8px] bg-indigo-950 border border-indigo-900 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">ĐANG BẬT</span>
                      )}
                    </label>
                    <p className="text-[11.5px] text-zinc-455 leading-relaxed">
                      Bảo vệ quyền riêng tư bằng cách tự động che giấu Email, Số điện thoại, ID người dùng và ngắt các thiết bị liên kết khi chia sẻ màn hình.
                    </p>
                  </div>
                  <ToggleSwitch checked={streamerMode} onChange={toggleStreamerMode} />
                </div>
              </div>
            </div>
          )}

          {/* ======================= TAB: VOICE ======================= */}
          {activeTab === 'voice' && (
            <div className="space-y-8 pb-10">
              <div>
                <h3 className="text-xl font-bold text-white">Âm thanh & Video</h3>
                <p className="text-xs text-zinc-400 mt-1">Cấu hình thiết bị ghi âm, phát âm thanh và chất lượng cuộc gọi.</p>
              </div>

              {/* Device Selectors */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5 text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Input Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Thiết bị đầu vào (Microphone)</label>
                    <select
                      value={selectedInput}
                      onChange={(e) => setSelectedInput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      {inputs.length > 0 ? (
                        inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Microphone'}</option>)
                      ) : (
                        <option value="">Default Microphone Device</option>
                      )}
                    </select>
                  </div>

                  {/* Output Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300">Thiết bị đầu ra (Speaker)</label>
                    <select
                      value={selectedOutput}
                      onChange={(e) => setSelectedOutput(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 rounded-lg outline-none focus:border-indigo-500"
                    >
                      {outputs.length > 0 ? (
                        outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || 'Default Speakers'}</option>)
                      ) : (
                        <option value="">Default Audio Speaker</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Voice Testing Area */}
                <div className="border-t border-zinc-850 pt-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-zinc-300">Kiểm tra micro của bạn</div>
                      <p className="text-[11px] text-zinc-450">Bật tính năng này để kiểm tra xem micro có hoạt động bình thường không.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsTestingMic(!isTestingMic)}
                      className={`text-xs border-0 ${
                        isTestingMic ? 'bg-rose-650 hover:bg-rose-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {isTestingMic ? 'Dừng kiểm tra' : 'Kiểm tra micro'}
                    </Button>
                  </div>

                  {/* Animated Volume bar */}
                  <div className="space-y-1">
                    <span className="text-[10px] text-zinc-550 font-bold uppercase">Mức âm lượng đầu vào</span>
                    <div className="w-full h-2.5 bg-zinc-950 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-indigo-500 transition-all duration-75 ease-out rounded-full" 
                        style={{ width: `${micVolume}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-zinc-600">
                      <span>Im lặng</span>
                      <span>Hoàn hảo</span>
                    </div>
                  </div>
                </div>

                {/* Noise Suppression */}
                <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
                  <div className="space-y-0.5 max-w-sm">
                    <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                      Lọc nhiễu thông minh (AI Noise Suppression)
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950 border border-indigo-900 px-1.5 py-0.5 rounded">Bản Beta</span>
                    </div>
                    <p className="text-[11px] text-zinc-455 leading-relaxed">
                      Loại bỏ các tiếng ồn xung quanh như tiếng gõ bàn phím, tiếng quạt gió bằng mô hình học máy.
                    </p>
                  </div>
                  <ToggleSwitch checked={noiseSuppression} onChange={setNoiseSuppression} />
                </div>
              </div>
            </div>
          )}

          {/* ======================= TAB: NOTIFICATIONS ======================= */}
          {activeTab === 'notifications' && (
            <div className="space-y-8 pb-10">
              <div>
                <h3 className="text-xl font-bold text-white">Thông báo</h3>
                <p className="text-xs text-zinc-400 mt-1">Lựa chọn cách bạn muốn nhận tin nhắn và âm thanh nhắc nhở.</p>
              </div>

              {/* Notification Toggles */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
                {/* Desktop push */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white">Bật thông báo đẩy trên trình duyệt</div>
                    <p className="text-[11px] text-zinc-450">Nhận thông báo dạng banner trên góc màn hình khi có tin nhắn mới.</p>
                  </div>
                  <ToggleSwitch checked={desktopNotifs} onChange={setDesktopNotifs} />
                </div>

                {/* Unread indicators */}
                <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white">Hiển thị chấm đỏ tin nhắn chưa đọc</div>
                    <p className="text-[11px] text-zinc-450">Báo hiệu số lượng tin nhắn chưa đọc bên cạnh tên kênh và trên thanh Taskbar.</p>
                  </div>
                  <ToggleSwitch checked={unreadBadges} onChange={setUnreadBadges} />
                </div>

                {/* Sound Cues */}
                <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-sm font-bold text-white">Âm thanh thông báo hệ thống</div>
                    <p className="text-[11px] text-zinc-450">Phát âm thanh nhắc nhở khi có người nhắc đến bạn (@mention) hoặc cuộc gọi đến.</p>
                  </div>
                  <ToggleSwitch checked={soundCues} onChange={setSoundCues} />
                </div>
              </div>
            </div>
          )}

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
