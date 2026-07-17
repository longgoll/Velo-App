import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, MonitorOff, PhoneOff, Volume2, Loader2, ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import type { VoiceParticipant } from '@/hooks/useLiveKit';

interface DMCallRoomViewProps {
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
  isMaximized: boolean;
  onToggleMaximize: () => void;
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

export default function DMCallRoomView({
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
  isMaximized,
  onToggleMaximize,
}: DMCallRoomViewProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isMaximized) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (isMaximized) {
      setShowControls(false);
    }
  };

  useEffect(() => {
    setShowControls(true);
  }, [isMaximized]);

  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);

  // If we are connecting, display a beautiful compact loading state
  if (isConnecting) {
    return (
      <div className="mx-6 mt-3 p-4 bg-zinc-950/40 backdrop-blur-md border border-zinc-800/80 rounded-2xl flex items-center justify-between shadow-lg animate-in slide-in-from-top duration-255 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
          <div className="text-left">
            <h3 className="text-xs font-bold text-white">Đang kết nối cuộc gọi...</h3>
            <p className="text-[10px] text-zinc-500 mt-0.5">Kết nối thiết bị tới phòng cuộc gọi DM</p>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="px-3.5 py-1.5 bg-rose-600/10 border border-rose-500/20 text-rose-400 hover:bg-rose-600 hover:text-white rounded-xl text-xs font-bold transition duration-150 cursor-pointer outline-none active:scale-95"
        >
          Hủy
        </button>
      </div>
    );
  }

  if (!isConnected) return null;

  // Render Collapsed view: Sleek mini status bar to save space
  if (isCollapsed) {
    return (
      <div className="mx-6 mt-3 h-[52px] px-4 bg-zinc-950/65 backdrop-blur-md border border-zinc-800/80 rounded-2xl flex items-center justify-between shadow-md hover:border-zinc-700 transition duration-150 shrink-0 z-10 animate-in slide-in-from-top duration-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-white truncate">
            Đang gọi thoại: {participants.map(p => p.name || 'Người dùng').join(', ')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mini Control Action Buttons */}
          <button
            onClick={onToggleMic}
            className={`p-1.5 rounded-lg border transition outline-none cursor-pointer ${
              voiceMuted
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
            title={voiceMuted ? 'Mở Mic' : 'Tắt Mic'}
          >
            {voiceMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          
          <button
            onClick={onToggleCamera}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition outline-none cursor-pointer"
            title="Bật/Tắt Video"
          >
            {participants.find(p => p.isLocal)?.isVideoEnabled ? (
              <VideoIcon className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <VideoOff className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={onDisconnect}
            className="p-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition cursor-pointer outline-none border-0 active:scale-95 flex items-center justify-center"
            title="Gác máy"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-zinc-800 mx-1 shrink-0" />

          {/* Expand Toggle */}
          <button
            onClick={() => {
              setIsCollapsed(false);
            }}
            className="p-1.5 bg-zinc-900 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition outline-none border border-zinc-800 cursor-pointer"
            title="Mở rộng cuộc gọi"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Render Expanded view: Video/Avatar grid + full toolbar
  return (
    <div className={`mx-6 mt-3 bg-zinc-950/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-xl flex flex-col shrink-0 z-10 overflow-hidden animate-in slide-in-from-top duration-300 transition-all ${
      isMaximized ? 'flex-1 h-full mb-3' : ''
    }`}>
      
      {/* Top Header Controls bar */}
      <div className="px-4 py-2 border-b border-zinc-900/60 flex items-center justify-between bg-zinc-950/20">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cuộc gọi Direct Message</span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {/* Maximize / Restore Toggle Button */}
          <button
            onClick={onToggleMaximize}
            className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition border border-transparent hover:border-zinc-800 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title={isMaximized ? 'Thu nhỏ cửa sổ' : 'Phóng to cửa sổ'}
          >
            {isMaximized ? (
              <>
                <span>Mặc định</span>
                <Minimize2 className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Phóng to</span>
                <Maximize2 className="w-3.5 h-3.5" />
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsCollapsed(true);
            }}
            className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-lg transition border border-transparent hover:border-zinc-800 cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            title="Thu nhỏ thành thanh trạng thái"
          >
            <span>Ẩn</span>
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Peer grid */}
      <div 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={`relative p-4 flex items-center justify-center transition-all overflow-hidden ${
          isMaximized ? 'flex-1 min-h-[300px] md:min-h-[450px]' : 'min-h-[140px] max-h-[220px]'
        }`}
      >
        <div className={`grid gap-4 w-full h-full transition-all ${
          isMaximized ? 'max-w-5xl max-h-[75vh]' : 'max-w-4xl'
        } ${participants.length <= 1 ? 'grid-cols-1 max-w-[340px] md:max-w-[420px]' : 'grid-cols-2'}`}>
          {participants.map((p) => {
            const showVideo = p.isVideoEnabled && p.videoTrack;
            const showScreenShare = p.isScreenSharing && p.screenShareTrack;
            const displayInitials = p.name ? p.name.substring(0, 2).toUpperCase() : 'U';

            return (
              <div
                key={p.identity}
                className={`relative rounded-xl overflow-hidden bg-zinc-900/40 border aspect-video flex flex-col items-center justify-center transition-all duration-300 shadow-md ${
                  p.isSpeaking && !p.isAudioMuted
                    ? 'border-emerald-500/80 shadow-[0_0_10px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'border-zinc-850 hover:border-zinc-800'
                }`}
              >
                {/* Auto Play Audio for Remote user */}
                {!p.isLocal && p.audioTrack && !voiceDeafened && (
                  <AudioTrack track={p.audioTrack} />
                )}

                {/* Render Video or Screen Share if active */}
                {showScreenShare ? (
                  <VideoTrack track={p.screenShareTrack} className="absolute inset-0 w-full h-full" />
                ) : showVideo ? (
                  <VideoTrack track={p.videoTrack} className="absolute inset-0 w-full h-full animate-in fade-in duration-200" />
                ) : (
                  /* Avatar Card View */
                  <div className="flex flex-col items-center gap-2">
                    <Avatar className={`border-2 shadow-md relative transition-all duration-200 ${
                      p.isSpeaking && !p.isAudioMuted 
                        ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' 
                        : 'border-zinc-855'
                    } ${
                      isMaximized ? 'w-20 h-20 md:w-24 md:h-24' : 'w-12 h-12'
                    }`}>
                      <AvatarFallback className={`font-bold text-white ${getAvatarGradient(p.name || '')} ${
                        isMaximized ? 'text-2xl md:text-3xl' : 'text-sm'
                      }`}>
                        {displayInitials}
                      </AvatarFallback>
                      {p.isAudioMuted && (
                        <div className="absolute -bottom-1 -right-1 bg-rose-600 border border-zinc-950 text-white rounded-full p-0.5 shadow-sm">
                          <MicOff className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </Avatar>
                  </div>
                )}

                {/* Participant Label overlay */}
                <div className="absolute bottom-2 left-2 bg-zinc-950/70 backdrop-blur-md px-2 py-0.5 rounded-lg border border-zinc-800/80 text-[10px] font-bold text-white flex items-center gap-1.5 max-w-[85%] select-none">
                  {p.isLocal && (
                    <span className="text-indigo-400 uppercase tracking-widest text-[8px] bg-indigo-950/50 border border-indigo-500/10 px-1 rounded-sm shrink-0">Bạn</span>
                  )}
                  <span className="truncate">{p.name || 'Người dùng'}</span>
                  {!p.isLocal && p.isAudioMuted && (
                    <MicOff className="w-2.5 h-2.5 text-rose-400 shrink-0" />
                  )}
                  {p.isSpeaking && !p.isAudioMuted && (
                    <div className="flex items-center gap-[1.5px] h-2.5 shrink-0">
                      <div className="w-[1.2px] bg-emerald-400 h-1.5 rounded-full animate-pulse" />
                      <div className="w-[1.2px] bg-emerald-400 h-2 rounded-full animate-pulse" />
                      <div className="w-[1.2px] bg-emerald-400 h-1 rounded-full animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Floating Controls Overlay (Only visible when Maximized) */}
        {isMaximized && (
          <div 
            onMouseEnter={() => {
              if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
              }
            }}
            onMouseLeave={handleMouseMove}
            className={`absolute bottom-6 left-1/2 -translate-x-1/2 bg-zinc-950/85 backdrop-blur-xl border border-zinc-800/80 px-6 py-3 rounded-2xl flex items-center gap-4.5 shadow-2xl z-20 transition-all duration-300 ${
              showControls ? 'opacity-100 translate-y-0 visible' : 'opacity-0 translate-y-4 invisible pointer-events-none'
            }`}
          >
            {/* Toggle Mic */}
            <button
              onClick={onToggleMic}
              className={`p-3 rounded-xl border transition-all duration-150 outline-none cursor-pointer active:scale-95 ${
                voiceMuted
                  ? 'bg-rose-650 border-rose-600 text-white shadow-lg shadow-rose-650/10'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title={voiceMuted ? 'Mở Mic' : 'Tắt Mic'}
            >
              {voiceMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Toggle Camera */}
            <button
              onClick={onToggleCamera}
              className={`p-3 rounded-xl border transition-all duration-150 outline-none cursor-pointer active:scale-95 ${
                participants.find(p => p.isLocal)?.isVideoEnabled
                  ? 'bg-emerald-650 border-emerald-600 text-white shadow-lg shadow-emerald-650/10'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Bật/Tắt Video"
            >
              {participants.find(p => p.isLocal)?.isVideoEnabled ? (
                <VideoIcon className="w-5 h-5" />
              ) : (
                <VideoOff className="w-5 h-5" />
              )}
            </button>

            {/* Toggle Screen Share */}
            <button
              onClick={onToggleScreenShare}
              className={`p-3 rounded-xl border transition-all duration-150 outline-none cursor-pointer active:scale-95 ${
                participants.find(p => p.isLocal)?.isScreenSharing
                  ? 'bg-emerald-650 border-emerald-600 text-white shadow-lg shadow-emerald-650/10'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Chia sẻ màn hình"
            >
              {participants.find(p => p.isLocal)?.isScreenSharing ? (
                <Monitor className="w-5 h-5" />
              ) : (
                <MonitorOff className="w-5 h-5" />
              )}
            </button>

            {/* Toggle Deafen */}
            <button
              onClick={onToggleDeafen}
              className={`p-3 rounded-xl border transition-all duration-150 outline-none cursor-pointer active:scale-95 ${
                voiceDeafened
                  ? 'bg-rose-650 border-rose-600 text-white shadow-lg shadow-rose-650/10'
                  : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title={voiceDeafened ? 'Mở âm thanh' : 'Tắt âm thanh (Deafen)'}
            >
              {voiceDeafened ? (
                <span className="relative flex items-center justify-center">
                  <Volume2 className="w-5 h-5 opacity-40" />
                  <span className="absolute w-[20px] h-[2.5px] bg-white rotate-45" />
                </span>
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <div className="w-[1px] h-6 bg-zinc-800 mx-1 shrink-0" />

            {/* Disconnect */}
            <button
              onClick={onDisconnect}
              className="p-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all duration-150 cursor-pointer outline-none border-0 shadow-lg shadow-rose-650/20 active:scale-95 flex items-center justify-center"
              title="Gác máy"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Flat Control Actions bar (Only visible when not Maximized) */}
      {!isMaximized && (
        <div className="h-[52px] border-t border-zinc-900/60 bg-zinc-950/30 backdrop-blur-sm flex items-center justify-center gap-3">
          {/* Toggle Mic */}
          <button
            onClick={onToggleMic}
            className={`p-2 rounded-xl border transition outline-none cursor-pointer ${
              voiceMuted
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-400 hover:bg-rose-950/60'
                : 'bg-zinc-900 border-zinc-850 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title={voiceMuted ? 'Mở Mic' : 'Tắt Mic'}
          >
            {voiceMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Toggle Camera */}
          <button
            onClick={onToggleCamera}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-855 text-zinc-300 hover:text-white hover:bg-zinc-800 transition outline-none cursor-pointer"
            title="Bật/Tắt Video"
          >
            {participants.find(p => p.isLocal)?.isVideoEnabled ? (
              <VideoIcon className="w-4 h-4 text-emerald-400" />
            ) : (
              <VideoOff className="w-4 h-4" />
            )}
          </button>

          {/* Toggle Screen Share */}
          <button
            onClick={onToggleScreenShare}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-855 text-zinc-300 hover:text-white hover:bg-zinc-800 transition outline-none cursor-pointer"
            title="Chia sẻ màn hình"
          >
            {participants.find(p => p.isLocal)?.isScreenSharing ? (
              <Monitor className="w-4 h-4 text-emerald-400 animate-pulse" />
            ) : (
              <MonitorOff className="w-4 h-4" />
            )}
          </button>

          {/* Toggle Deafen */}
          <button
            onClick={onToggleDeafen}
            className={`p-2 rounded-xl border transition outline-none cursor-pointer ${
              voiceDeafened
                ? 'bg-rose-950/40 border-rose-900/50 text-rose-455 hover:bg-rose-950/60'
                : 'bg-zinc-900 border-zinc-855 text-zinc-300 hover:text-white hover:bg-zinc-800'
            }`}
            title={voiceDeafened ? 'Mở âm thanh' : 'Tắt âm thanh (Deafen)'}
          >
            {voiceDeafened ? (
              <span className="relative flex items-center justify-center">
                <Volume2 className="w-4 h-4 opacity-40" />
                <span className="absolute w-[18px] h-[1.5px] bg-rose-500 rotate-45" />
              </span>
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>

          {/* Disconnect */}
          <button
            onClick={onDisconnect}
            className="p-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer outline-none border-0 shadow-md active:scale-95"
            title="Gác máy"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
