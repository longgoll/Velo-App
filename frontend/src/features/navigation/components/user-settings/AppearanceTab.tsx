import { useState, useEffect } from 'react';
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

export function AppearanceTab() {
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

  return (
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
            <div className="space-y-0.5 text-left">
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
            <div className="space-y-0.5 text-left">
              <div className="text-xs font-bold text-white">Tự động chuyển đổi ký tự thành Emoji</div>
              <p className="text-[11px] text-zinc-450">Tự động biến đổi các ký tự cảm xúc như <code>:)</code> thành <code>🙂</code> khi gõ tin nhắn.</p>
            </div>
            <ToggleSwitch checked={autoEmote} onChange={toggleAutoEmote} />
          </div>

          {/* Show send button */}
          <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
            <div className="space-y-0.5 text-left">
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
          <div className="space-y-1 max-w-md text-left">
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
  );
}
