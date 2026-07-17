import { useEffect } from 'react';
import { Phone, PhoneOff, Video, Volume2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';

export default function IncomingCallDialog() {
  const { incomingCall, setIncomingCall, setActiveChannelId, setActiveVoiceChannelId } = useChatStore();

  useEffect(() => {
    if (!incomingCall) return;

    // Web Audio API Ringtone Synthesizer
    let audioCtx: AudioContext | null = null;
    let ringInterval: any = null;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playTone = () => {
        if (!audioCtx || audioCtx.state === 'closed') return;
        
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Standard dual-frequency telephone ring tones (440Hz + 480Hz)
        osc1.frequency.value = 440;
        osc2.frequency.value = 480;

        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime + 0.8);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 1.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(audioCtx.currentTime + 1.2);
        osc2.stop(audioCtx.currentTime + 1.2);
      };

      // Play immediately and then repeat every 2.5 seconds
      playTone();
      ringInterval = setInterval(playTone, 2500);
    } catch (e) {
      console.error('Failed to initialize synthesized ringtone:', e);
    }

    return () => {
      if (ringInterval) clearInterval(ringInterval);
      if (audioCtx) {
        audioCtx.close().catch(err => console.error('Error closing AudioContext:', err));
      }
    };
  }, [incomingCall]);

  if (!incomingCall) return null;

  const initials = incomingCall.callerName ? incomingCall.callerName.substring(0, 2).toUpperCase() : 'U';

  const handleAccept = () => {
    // 1. Navigate to the DM conversation
    setActiveChannelId(incomingCall.channelId, 'dm', useChatStore.getState().activeWorkspaceId);
    
    // 2. Connect to the voice call
    setActiveVoiceChannelId(incomingCall.channelId);
    
    // 3. Clear the dialog
    setIncomingCall(null);
  };

  const handleDecline = () => {
    setIncomingCall(null);
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none animate-in fade-in duration-200">
      
      {/* Glow Effect Box */}
      <div className="relative w-80 bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-250">
        
        {/* Ambient pulse background */}
        <div className="absolute top-10 w-24 h-24 rounded-full bg-emerald-500/10 blur-xl animate-pulse pointer-events-none" />

        {/* Ringing Caller Avatar */}
        <div className="relative mb-5 mt-2">
          {/* Ripple Wave effects */}
          <span className="absolute inset-0 rounded-full border border-emerald-500/30 animate-ping opacity-75" />
          <span className="absolute -inset-2 rounded-full border border-emerald-500/20 animate-pulse opacity-40" />
          
          <Avatar className="w-16 h-16 border-2 border-zinc-950 shadow-lg relative z-10">
            <AvatarFallback className={`text-lg font-bold text-white ${getAvatarGradient(incomingCall.callerName)}`}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Caller Info */}
        <h3 className="text-sm font-bold text-white leading-none">{incomingCall.callerName}</h3>
        <p className="text-[11px] text-zinc-550 mt-1.5 flex items-center gap-1.5 justify-center">
          <Volume2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>đang gọi {incomingCall.isVideo ? 'video' : 'thoại'} cho bạn...</span>
        </p>

        {/* Buttons */}
        <div className="flex gap-4 w-full mt-6">
          {/* Decline Button */}
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white font-bold text-xs transition duration-150 cursor-pointer flex items-center justify-center gap-2 active:scale-95 outline-none"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            Từ chối
          </button>

          {/* Accept Button */}
          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition duration-150 shadow-md shadow-emerald-600/10 cursor-pointer flex items-center justify-center gap-2 active:scale-95 border-0 outline-none"
          >
            {incomingCall.isVideo ? <Video className="w-3.5 h-3.5" /> : <Phone className="w-3.5 h-3.5" />}
            Trả lời
          </button>
        </div>
      </div>
    </div>
  );
}
