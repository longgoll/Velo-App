import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff, Users, Volume2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import type { VoiceParticipant } from '@/hooks/useLiveKit';

interface VoiceRoomViewProps {
  channelName: string;
  participants: VoiceParticipant[];
  isConnected: boolean;
  isConnecting: boolean;
  voiceMuted: boolean;
  voiceDeafened: boolean;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onDisconnect: () => void;
  onToggleDeafen: () => void;
}

// Subcomponent to render remote/local WebRTC video stream
interface VideoTrackProps {
  track: any;
  className?: string;
}

function VideoTrack({ track, className }: VideoTrackProps) {
  const elRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || !track) return;
    track.attach(el);
    return () => {
      track.detach(el);
    };
  }, [track]);

  return (
    <video
      ref={elRef}
      className={className}
      autoPlay
      playsInline
      style={{ objectFit: 'cover' }}
    />
  );
}

// Subcomponent to automatically attach and play remote audio tracks
function AudioTrack({ track }: { track: any }) {
  useEffect(() => {
    if (!track) return;
    const el = track.attach();
    return () => {
      track.detach(el);
    };
  }, [track]);

  return null;
}

export default function VoiceRoomView({
  channelName,
  participants,
  isConnected,
  isConnecting,
  voiceMuted,
  voiceDeafened,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onDisconnect,
  onToggleDeafen,
}: VoiceRoomViewProps) {

  // Dynamic grid column calculation
  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1';
    if (count <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (count <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  return (
    <div className="flex-1 bg-zinc-950 flex flex-col justify-between h-full select-none relative overflow-hidden animate-in fade-in duration-300">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[100px] pointer-events-none" />

      {/* Header Info */}
      <div className="px-6 h-[52px] border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md flex items-center justify-between z-10">
        <div className="flex items-center gap-2.5">
          <Volume2 className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <h2 className="text-sm font-bold text-white leading-none">{channelName}</h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {isConnecting ? 'Đang kết nối...' : isConnected ? 'Đã kết nối thoại' : 'Đang ngắt kết nối...'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 text-xs bg-zinc-900/60 px-2.5 py-1 rounded-lg border border-zinc-800/40">
          <Users className="w-3.5 h-3.5 text-zinc-500" />
          <span className="font-bold text-zinc-300">{participants.length}</span>
          <span className="text-zinc-500">đang tham gia</span>
        </div>
      </div>

      {/* Participants Video/Audio grid */}
      <div className="flex-1 p-6 overflow-y-auto flex items-center justify-center min-h-0 z-10">
        {participants.length === 0 ? (
          <div className="text-center animate-pulse py-12">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-sm text-zinc-500">Đang đợi mọi người tham gia phòng thoại...</p>
          </div>
        ) : (
          <div className={`grid gap-4 w-full h-full max-w-6xl max-h-[80vh] ${getGridCols(participants.length)}`}>
            {participants.map((p) => {
              const showVideo = p.isVideoEnabled && p.videoTrack;
              const showScreenShare = p.isScreenSharing && p.screenShareTrack;
              const displayInitials = p.name ? p.name.substring(0, 2).toUpperCase() : 'U';

              return (
                <div
                  key={p.identity}
                  className={`relative rounded-2xl overflow-hidden bg-zinc-900/60 border aspect-video flex flex-col items-center justify-center transition-all duration-300 shadow-lg ${
                    p.isSpeaking && !p.isAudioMuted
                      ? 'border-emerald-500/80 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-2 ring-emerald-500/50'
                      : 'border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  {/* Remote Audio Track (always rendered, won't show anything visually) */}
                  {!p.isLocal && p.audioTrack && !voiceDeafened && (
                    <AudioTrack track={p.audioTrack} />
                  )}

                  {/* Render Video or Screen Share */}
                  {showScreenShare ? (
                    <VideoTrack track={p.screenShareTrack} className="absolute inset-0 w-full h-full" />
                  ) : showVideo ? (
                    <VideoTrack track={p.videoTrack} className="absolute inset-0 w-full h-full" />
                  ) : (
                    /* Default Avatar View */
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="w-16 h-16 border-2 border-zinc-800 shadow-xl relative">
                        <AvatarFallback className={`text-lg font-bold text-white ${getAvatarGradient(p.name || '')}`}>
                          {displayInitials}
                        </AvatarFallback>
                        {p.isAudioMuted && (
                          <div className="absolute -bottom-1 -right-1 bg-rose-600 border-2 border-zinc-900 text-white rounded-full p-1 shadow-md">
                            <MicOff className="w-3 h-3" />
                          </div>
                        )}
                      </Avatar>
                    </div>
                  )}

                  {/* Participant Name Overlay */}
                  <div className="absolute bottom-3 left-3 bg-zinc-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-zinc-800/80 text-[11px] font-bold text-white flex items-center gap-2 max-w-[80%]">
                    {p.isLocal ? (
                      <span className="text-indigo-400 uppercase tracking-widest text-[9px] bg-indigo-950/50 border border-indigo-500/20 px-1.5 py-0.5 rounded-md shrink-0">Bạn</span>
                    ) : null}
                    <span className="truncate">{p.name || 'Người dùng'}</span>
                    
                    {!p.isLocal && p.isAudioMuted && (
                      <MicOff className="w-3 h-3 text-rose-400 shrink-0" />
                    )}
                    {p.isSpeaking && !p.isAudioMuted && (
                      <div className="flex items-center gap-[2px] h-3 shrink-0">
                        <div className="w-[1.5px] bg-emerald-400 h-2 rounded-full animate-pulse" />
                        <div className="w-[1.5px] bg-emerald-400 h-3 rounded-full animate-pulse" />
                        <div className="w-[1.5px] bg-emerald-400 h-1.5 rounded-full animate-pulse" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Toolbar Controls */}
      <div className="h-[76px] border-t border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center gap-4 z-10 shrink-0">
        {/* Toggle Mic */}
        <button
          onClick={onToggleMic}
          className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer outline-none ${
            voiceMuted
              ? 'bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-950/60'
              : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850'
          }`}
          title={voiceMuted ? 'Mở Micro' : 'Tắt Micro'}
        >
          {voiceMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {/* Toggle Camera */}
        <button
          onClick={onToggleCamera}
          className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all duration-200 cursor-pointer outline-none"
          title="Bật/Tắt Video"
        >
          {participants.find(p => p.isLocal)?.isVideoEnabled ? (
            <VideoIcon className="w-5 h-5 text-emerald-400" />
          ) : (
            <VideoOff className="w-5 h-5" />
          )}
        </button>

        {/* Toggle Screen Share */}
        <button
          onClick={onToggleScreenShare}
          className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850 transition-all duration-200 cursor-pointer outline-none"
          title="Chia sẻ màn hình"
        >
          {participants.find(p => p.isLocal)?.isScreenSharing ? (
            <Monitor className="w-5 h-5 text-emerald-400 animate-pulse" />
          ) : (
            <MonitorOff className="w-5 h-5" />
          )}
        </button>

        {/* Toggle Deafen */}
        <button
          onClick={onToggleDeafen}
          className={`p-3.5 rounded-2xl border transition-all duration-200 cursor-pointer outline-none ${
            voiceDeafened
              ? 'bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-950/60'
              : 'bg-zinc-900 border-zinc-800/80 text-zinc-300 hover:text-white hover:bg-zinc-850'
          }`}
          title={voiceDeafened ? 'Mở âm thanh' : 'Tắt âm thanh (Deafen)'}
        >
          {voiceDeafened ? (
            <span className="relative flex items-center justify-center">
              <Volume2 className="w-5 h-5 opacity-40" />
              <span className="absolute w-[22px] h-[2px] bg-rose-500 rotate-45" />
            </span>
          ) : (
            <Volume2 className="w-5 h-5" />
          )}
        </button>

        {/* Disconnect */}
        <button
          onClick={onDisconnect}
          className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition-all duration-200 cursor-pointer outline-none border-0 shadow-lg shadow-rose-600/10 active:scale-95"
          title="Ngắt kết nối cuộc gọi"
        >
          <PhoneOff className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
