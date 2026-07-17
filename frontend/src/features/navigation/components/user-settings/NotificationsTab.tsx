import { useState } from 'react';

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

export function NotificationsTab() {
  // Notifications states
  const [desktopNotifs, setDesktopNotifs] = useState(true);
  const [unreadBadges, setUnreadBadges] = useState(true);
  const [soundCues, setSoundCues] = useState(true);

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h3 className="text-xl font-bold text-white">Thông báo</h3>
        <p className="text-xs text-zinc-400 mt-1">Lựa chọn cách bạn muốn nhận tin nhắn và âm thanh nhắc nhở.</p>
      </div>

      {/* Notification Toggles */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6 text-left">
        {/* Desktop push */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5 text-left">
            <div className="text-sm font-bold text-white">Bật thông báo đẩy trên trình duyệt</div>
            <p className="text-[11px] text-zinc-450">Nhận thông báo dạng banner trên góc màn hình khi có tin nhắn mới.</p>
          </div>
          <ToggleSwitch checked={desktopNotifs} onChange={setDesktopNotifs} />
        </div>

        {/* Unread indicators */}
        <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
          <div className="space-y-0.5 text-left">
            <div className="text-sm font-bold text-white">Hiển thị chấm đỏ tin nhắn chưa đọc</div>
            <p className="text-[11px] text-zinc-450">Báo hiệu số lượng tin nhắn chưa đọc bên cạnh tên kênh và trên thanh Taskbar.</p>
          </div>
          <ToggleSwitch checked={unreadBadges} onChange={setUnreadBadges} />
        </div>

        {/* Sound Cues */}
        <div className="border-t border-zinc-850 pt-5 flex items-center justify-between">
          <div className="space-y-0.5 text-left">
            <div className="text-sm font-bold text-white">Âm thanh thông báo hệ thống</div>
            <p className="text-[11px] text-zinc-450">Phát âm thanh nhắc nhở khi có người nhắc đến bạn (@mention) hoặc cuộc gọi đến.</p>
          </div>
          <ToggleSwitch checked={soundCues} onChange={setSoundCues} />
        </div>
      </div>
    </div>
  );
}
