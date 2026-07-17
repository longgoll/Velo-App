import { Hash, PhoneCall, Video, Info } from 'lucide-react';

interface ChatHeaderProps {
  activeDmChannel: any;
  chatTitle: string;
  handleStartVoiceCall: () => void;
  handleStartVideoCall: () => void;
  showDetails: boolean;
  setShowDetails: (val: boolean) => void;
  setActiveThreadId: (val: string | null) => void;
  toggleExplorer: () => void;
  explorerOpen: boolean;
}

export function ChatHeader({
  activeDmChannel,
  chatTitle,
  handleStartVoiceCall,
  handleStartVideoCall,
  showDetails,
  setShowDetails,
  setActiveThreadId,
  toggleExplorer,
  explorerOpen,
}: ChatHeaderProps) {
  return (
    <div className="px-6 h-[52px] border-b border-zinc-200 dark:border-zinc-950/80 flex items-center justify-between bg-white dark:bg-zinc-900/40 backdrop-blur-md shadow-sm shrink-0 z-10">
      <div className="flex items-center gap-2 min-w-0">
        {activeDmChannel ? (
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
        ) : (
          <Hash className="w-5 h-5 text-zinc-550 shrink-0" />
        )}
        <span className="font-bold text-white text-sm truncate">
          {chatTitle}
        </span>
        {activeDmChannel ? (
          <span className="text-[8px] font-bold text-emerald-450 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-full select-none ml-2 uppercase tracking-wide">
            Trực tuyến
          </span>
        ) : (
          <span className="text-[8px] font-bold text-indigo-450 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded-full select-none ml-2 uppercase tracking-wide">
            Hoạt động
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {activeDmChannel && (
          <>
            <button
              onClick={handleStartVoiceCall}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
              title="Bắt đầu cuộc gọi thoại"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
            <button
              onClick={handleStartVideoCall}
              className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-emerald-500 transition outline-none border-0 cursor-pointer"
              title="Bắt đầu cuộc gọi video"
            >
              <Video className="w-4 h-4" />
            </button>
          </>
        )}
        
        <button
          onClick={() => {
            setShowDetails(!showDetails);
            setActiveThreadId(null);
          }}
          className={`p-2 rounded-full transition outline-none border-0 cursor-pointer ${
            showDetails 
              ? 'bg-indigo-600/15 text-indigo-400 hover:bg-indigo-500/25' 
              : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
          }`}
          title="Thông tin nhóm / bạn bè"
        >
          <Info className="w-4 h-4" />
        </button>

        <button
          onClick={toggleExplorer}
          className="px-3 py-1 bg-zinc-800/80 text-xs text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition outline-none border-0 cursor-pointer"
          title="Ctrl + B"
        >
          {explorerOpen ? 'Ẩn Sidebar' : 'Hiện Sidebar'}
        </button>
      </div>
    </div>
  );
}
export default ChatHeader;
