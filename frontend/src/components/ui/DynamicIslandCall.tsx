import { useState } from 'react';
import { useChatStore } from '@/store/useChatStore';
import { useVoiceCall } from '@/context/VoiceCallContext';
import { useQuery } from '@tanstack/react-query';
import type { Channel, Workspace } from '@/types';
import { Mic, MicOff, Volume2, VolumeX, PhoneOff, ArrowUpRight } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function DynamicIslandCall() {
  const {
    activeWorkspaceId,
    activeVoiceChannelId,
    voiceMuted,
    voiceDeafened,
    setActiveChannelId,
    setVoiceMuted,
    setVoiceDeafened,
  } = useChatStore();

  const {
    participants,
    isConnected,
    isConnecting,
    disconnectCall,
  } = useVoiceCall();

  const [isHovered, setIsHovered] = useState(false);

  // Fetch workspaces & channels to find active voice channel name
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    enabled: !!activeWorkspaceId,
  });

  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['channels', activeWorkspaceId],
    enabled: !!activeWorkspaceId,
  });

  const voiceChan = channels.find((c) => c.id === activeVoiceChannelId);
  const activeWs = workspaces.find((w) => w.id === activeWorkspaceId);

  if (!activeVoiceChannelId) return null;

  const handleDisconnect = (e: React.MouseEvent) => {
    e.stopPropagation();
    disconnectCall();
  };

  const handleReturnToRoom = () => {
    setActiveChannelId(activeVoiceChannelId);
  };

  return (
    <TooltipProvider>
      <div 
        onClick={handleReturnToRoom}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`absolute top-3 left-1/2 -translate-x-1/2 bg-zinc-950/90 backdrop-blur-xl border border-zinc-800/80 rounded-full flex items-center gap-4 px-4 py-2 shadow-2xl z-40 transition-all duration-300 cursor-pointer ${
          isHovered ? 'w-[320px] py-3 px-5 border-indigo-500/30' : 'w-[200px]'
        }`}
      >
        <style>{`
          @keyframes soundWave {
            0%, 100% { height: 4px; }
            50% { height: 14px; }
          }
          .wave-1 { animation: soundWave 0.6s ease-in-out infinite alternate; }
          .wave-2 { animation: soundWave 0.8s ease-in-out infinite alternate 0.15s; }
          .wave-3 { animation: soundWave 0.5s ease-in-out infinite alternate 0.3s; }
          .wave-4 { animation: soundWave 0.7s ease-in-out infinite alternate 0.45s; }
        `}</style>

        {/* Waveform / Connection Indicator */}
        <div className="flex items-end gap-[2px] h-[16px] shrink-0 w-[14px]">
          <div className={`w-[2px] bg-emerald-400 rounded-full ${isConnected && !voiceMuted ? 'wave-1' : 'h-[4px]'}`} />
          <div className={`w-[2px] bg-emerald-400 rounded-full ${isConnected && !voiceMuted ? 'wave-2' : 'h-[4px]'}`} />
          <div className={`w-[2px] bg-emerald-400 rounded-full ${isConnected && !voiceMuted ? 'wave-3' : 'h-[4px]'}`} />
          <div className={`w-[2px] bg-emerald-400 rounded-full ${isConnected && !voiceMuted ? 'wave-4' : 'h-[4px]'}`} />
        </div>

        {/* Center: Title / Channel info */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest leading-none">
            {isConnecting ? 'Connecting...' : 'Voice Connected'}
          </div>
          <div className="text-xs font-bold text-white truncate mt-1">
            {voiceChan?.name || 'Phòng thoại'}
          </div>
          {isHovered && (
            <div className="text-[9px] text-zinc-500 truncate mt-0.5">
              Không gian: {activeWs?.name || 'Không xác định'}
            </div>
          )}
        </div>

        {/* Hover participants state */}
        {isHovered ? (
          <div className="flex items-center gap-3 shrink-0 animate-in fade-in zoom-in duration-200">
            {/* Real call participants */}
            <div className="flex -space-x-1.5 overflow-hidden">
              {participants.slice(0, 3).map((p) => {
                const initials = p.name ? p.name.substring(0, 2).toUpperCase() : 'U';
                return (
                  <Avatar key={p.identity} size="sm" className="w-5 h-5 border border-zinc-950">
                    <AvatarFallback className={`text-[7px] font-bold ${getAvatarGradient(p.name || '')}`}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {participants.length > 3 && (
                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-950 flex items-center justify-center text-[7px] font-bold text-zinc-400 shrink-0">
                  +{participants.length - 3}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Toggle Mute */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoiceMuted(!voiceMuted);
                      }}
                      className={`p-1.5 rounded-lg transition border-0 cursor-pointer ${
                        voiceMuted ? 'bg-rose-950/40 text-rose-400 hover:bg-rose-950/60' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {voiceMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    </button>
                  }
                />
                <TooltipContent side="bottom">{voiceMuted ? 'Mở Micro' : 'Tắt Micro'}</TooltipContent>
              </Tooltip>

              {/* Toggle Deafen */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setVoiceDeafened(!voiceDeafened);
                      }}
                      className={`p-1.5 rounded-lg transition border-0 cursor-pointer ${
                        voiceDeafened ? 'bg-rose-950/40 text-rose-400 hover:bg-rose-950/60' : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                    >
                      {voiceDeafened ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                    </button>
                  }
                />
                <TooltipContent side="bottom">{voiceDeafened ? 'Mở Âm thanh' : 'Tắt Âm thanh'}</TooltipContent>
              </Tooltip>

              {/* Disconnect */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleDisconnect}
                      className="p-1.5 bg-rose-600 hover:bg-rose-500 rounded-lg text-white transition border-0 cursor-pointer"
                    >
                      <PhoneOff className="w-3 h-3" />
                    </button>
                  }
                />
                <TooltipContent side="bottom">Rời khỏi</TooltipContent>
              </Tooltip>
            </div>
          </div>
        ) : (
          <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
        )}
      </div>
    </TooltipProvider>
  );
}
