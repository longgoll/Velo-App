import React, { useState } from 'react';
import { 
  User, 
  Palette, 
  Volume2, 
  Bell, 
  Settings, 
  Shield, 
  Key,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

interface UserSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TabType = 'account' | 'appearance' | 'voice' | 'notifications';

export default function UserSettingsModal({
  open,
  onOpenChange,
}: UserSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('account');

  // Retrieve current user from local storage
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'account', label: 'Tài khoản của tôi', icon: User },
    { id: 'appearance', label: 'Giao diện', icon: Palette },
    { id: 'voice', label: 'Âm thanh & Video', icon: Volume2 },
    { id: 'notifications', label: 'Thông báo', icon: Bell },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[90vw] h-[500px] p-0 overflow-hidden flex bg-zinc-950 border border-zinc-800 text-zinc-200">
        {/* Left Sidebar */}
        <div className="w-[180px] bg-zinc-900 border-r border-zinc-800/60 p-3 flex flex-col gap-1.5 shrink-0 select-none">
          <div className="flex items-center gap-2 px-2 py-1.5 mb-3 text-zinc-400">
            <Settings className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Cài đặt</span>
          </div>

          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer border-0 outline-none ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Area */}
        <div className="flex-1 flex flex-col min-w-0 p-6 overflow-y-auto">
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Tài khoản của tôi</h3>
                <p className="text-xs text-zinc-400 mt-1">Quản lý cài đặt tài khoản và thông tin bảo mật của bạn.</p>
              </div>

              {/* User Card */}
              <div className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12 shadow-lg">
                    <AvatarFallback className={`text-sm font-bold text-white ${getAvatarGradient(currentUser?.username || '')}`}>
                      {currentUser?.username ? currentUser.username.slice(0, 2).toUpperCase() : '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <div className="text-sm font-bold text-white">{currentUser?.username || 'Người dùng'}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">ID: {currentUser?.id || 'Không rõ'}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-zinc-800 hover:bg-zinc-800 text-xs">
                  Đổi ảnh đại diện
                </Button>
              </div>

              {/* Security info placeholder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 bg-indigo-950/20 border border-indigo-500/10 rounded-xl p-3">
                  <Shield className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="text-xs font-semibold text-zinc-200">Bảo mật tài khoản</div>
                    <p className="text-[11px] text-zinc-450 mt-1 leading-relaxed">Tính năng thay đổi mật khẩu và xác thực hai yếu tố (2FA) đang được xây dựng.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-zinc-900 border border-zinc-800/40 rounded-xl p-3">
                  <Key className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                  <div className="text-left">
                    <div className="text-xs font-semibold text-zinc-400">Đăng nhập từ xa</div>
                    <p className="text-[11px] text-zinc-550 mt-1">Xem và quản lý các thiết bị đang đăng nhập tài khoản này.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Giao diện ứng dụng</h3>
                <p className="text-xs text-zinc-400 mt-1">Thay đổi chủ đề màu sắc và bố cục hiển thị.</p>
              </div>

              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-850 rounded-xl bg-zinc-900/30">
                <Palette className="w-8 h-8 text-zinc-600 mb-3" />
                <span className="text-xs font-semibold text-zinc-300">Tùy biến chủ đề & màu sắc</span>
                <span className="text-[10px] text-zinc-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Hệ thống giao diện sáng/tối và bộ sưu tập màu sắc cá nhân hóa đang được hoàn thiện.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Âm thanh & Video</h3>
                <p className="text-xs text-zinc-400 mt-1">Tùy chỉnh thiết bị đầu vào, đầu ra và chất lượng cuộc gọi.</p>
              </div>

              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-850 rounded-xl bg-zinc-900/30">
                <Volume2 className="w-8 h-8 text-zinc-600 mb-3" />
                <span className="text-xs font-semibold text-zinc-300">Cấu hình thiết bị Voice</span>
                <span className="text-[10px] text-zinc-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Thiết lập bộ lọc tạp âm AI, kiểm tra micro và lựa chọn thiết bị âm thanh chi tiết sẽ sớm ra mắt.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Thông báo & Hoạt động</h3>
                <p className="text-xs text-zinc-400 mt-1">Chọn cách bạn muốn nhận tin nhắn và âm thanh hệ thống.</p>
              </div>

              <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-zinc-850 rounded-xl bg-zinc-900/30">
                <Bell className="w-8 h-8 text-zinc-600 mb-3" />
                <span className="text-xs font-semibold text-zinc-300">Quản lý Thông báo</span>
                <span className="text-[10px] text-zinc-500 max-w-[280px] mt-1.5 leading-relaxed">
                  Bật/tắt thông báo đẩy, thông báo nổi và âm thanh nhắc nhở cho từng kênh.
                </span>
              </div>
            </div>
          )}

          <div className="mt-auto pt-6 border-t border-zinc-800/40 flex justify-end items-center gap-2">
            <span className="text-[10px] text-zinc-650 font-medium flex items-center gap-1">
              <Info className="w-3 h-3 text-zinc-600" /> Bản dựng thử nghiệm
            </span>
            <Button size="sm" onClick={() => onOpenChange(false)} className="bg-zinc-800 hover:bg-zinc-700 text-xs">
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
