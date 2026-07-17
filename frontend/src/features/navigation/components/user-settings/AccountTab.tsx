import { useState } from 'react';
import { 
  User, 
  Shield, 
  X, 
  Check, 
  Copy, 
  QrCode, 
  ShieldCheck, 
  Trash2, 
  CheckCircle2, 
  ChevronRight,
  Smartphone,
  Laptop,
  Monitor
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';

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

interface AccountTabProps {
  currentUser: any;
  streamerMode: boolean;
  onLogout?: () => void;
  onCloseSettings: () => void;
}

export function AccountTab({ currentUser, streamerMode, onLogout, onCloseSettings }: AccountTabProps) {
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

  // Deactivate/Delete Account simulator
  const handleDeactivateAccount = () => {
    if (confirm('Bạn có chắc chắn muốn vô hiệu hóa tài khoản của mình? Bạn có thể kích hoạt lại bất kỳ lúc nào.')) {
      toast.info('Tài khoản đã được vô hiệu hóa. Đang đăng xuất...');
      setTimeout(() => {
        if (onLogout) onLogout();
        onCloseSettings();
      }, 1500);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('CẢNH BÁO: Thao tác này sẽ xóa vĩnh viễn tài khoản của bạn và không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?')) {
      toast.error('Đang tiến hành xóa tài khoản của bạn. Hẹn gặp lại!');
      setTimeout(() => {
        if (onLogout) onLogout();
        onCloseSettings();
      }, 2000);
    }
  };

  return (
    <div className="space-y-8 pb-10">
      
      {/* Account Title */}
      <div>
        <h3 className="text-xl font-bold text-white">Tài khoản</h3>
        <p className="text-xs text-zinc-400 mt-1">Quản lý và cập nhật thông tin cá nhân của bạn.</p>
      </div>

      {/* CARD 1: THÔNG TIN TÀI KHOẢN */}
      <div id="account-info" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-5 scroll-mt-6">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Thông tin tài khoản</span>
        </div>

        <div className="space-y-4">
          {/* Row 1: Username */}
          <div className="flex items-center justify-between py-1.5 border-b border-zinc-800/30">
            <div className="space-y-1 text-left">
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
            <div className="space-y-1 text-left">
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
            <div className="space-y-1 text-left">
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
      <div id="password-security" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-6 scroll-mt-6">
        <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Mật khẩu & Bảo mật</span>
        </div>

        {/* Password Row */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5 text-left">
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
            <div className="space-y-0.5 text-left">
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
                    <div className="pt-2 text-left">
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
                <div className="space-y-3.5 max-w-sm text-left">
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
          <div className="space-y-0.5 text-left">
            <div className="text-sm font-bold text-white">Thiết Bị Đã Đăng Nhập</div>
            <div className="text-[11px] text-zinc-450">Quản lý và giám sát danh sách các phiên đăng nhập đang hoạt động.</div>
          </div>

          <div className="space-y-2">
            {devices.map((device) => {
              const DeviceIcon = device.icon;
              return (
                <div key={device.id} className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-855">
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
      <div id="account-status" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 scroll-mt-6">
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
      <div id="family-center" className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 space-y-4 scroll-mt-6">
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
  );
}
