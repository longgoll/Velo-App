import { PhoneCall } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';

interface CallBannerProps {
  callParticipants: any[];
  activeVoiceChannelId: string | null;
  activeChannelId: string;
}

export function CallBanner({
  callParticipants,
  activeVoiceChannelId,
  activeChannelId,
}: CallBannerProps) {
  if (callParticipants.length === 0 || activeVoiceChannelId === activeChannelId) {
    return null;
  }

  return (
    <div className="mx-6 mt-3 px-4 py-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between backdrop-blur-md shadow-md animate-in slide-in-from-top duration-200 shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-pulse">
          <PhoneCall className="w-4 h-4" />
        </div>
        <div className="text-left">
          <div className="text-xs font-bold text-white">Cuộc gọi thoại đang diễn ra</div>
          <div className="text-[10px] text-emerald-400 mt-0.5 font-medium">
            Đang trong cuộc gọi: {callParticipants.map((p: any) => p.name || p.identity).join(', ')}
          </div>
        </div>
      </div>
      <button
        onClick={() => {
          useChatStore.getState().setActiveVoiceChannelId(activeChannelId);
        }}
        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer border-0 active:scale-95 shadow-md shadow-emerald-600/15"
      >
        Tham gia
      </button>
    </div>
  );
}
export default CallBanner;
