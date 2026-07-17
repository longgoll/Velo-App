import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import { toast } from '@/store/useToastStore';

interface ProfileTabProps {
  currentUser: any;
  streamerMode: boolean;
  gradientIndex: number;
  setGradientIndex: (idx: number) => void;
}

export function ProfileTab({ currentUser, streamerMode, gradientIndex, setGradientIndex }: ProfileTabProps) {
  return (
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
  );
}
