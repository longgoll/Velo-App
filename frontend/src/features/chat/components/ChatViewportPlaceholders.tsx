import { Sparkles, Plus, Compass, Layers, MessageSquare } from 'lucide-react';
import type { Workspace, Channel } from '@/types';
import DynamicIslandCall from '../../../components/ui/DynamicIslandCall';

interface ChatViewportPlaceholdersProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  channels: Channel[];
  activeVoiceChannelId: string | null;
  setShowCreateWs: (val: boolean) => void;
  setShowJoinWs: (val: boolean) => void;
  setShowCreateChan: (val: boolean) => void;
}

export function ChatViewportPlaceholders({
  workspaces,
  activeWorkspaceId,
  channels,
  activeVoiceChannelId,
  setShowCreateWs,
  setShowJoinWs,
  setShowCreateChan,
}: ChatViewportPlaceholdersProps) {
  const hasWorkspaces = workspaces.length > 0;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950 text-center select-none relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[250px] h-[250px] rounded-full bg-violet-500/5 blur-[80px] pointer-events-none" />

      {/* Dynamic Island Voice call in case user navigates here */}
      {activeVoiceChannelId && <DynamicIslandCall />}
      
      {!hasWorkspaces ? (
        /* Premium Onboarding state for brand new users */
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white mb-6 mx-auto shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-8 h-8 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-bold text-white tracking-tight">Chào mừng đến với Antigravity!</h3>
          <p className="text-zinc-400 text-xs mt-2.5 mb-8 leading-relaxed">
            Bắt đầu hành trình trò chuyện của bạn bằng cách tạo một không gian làm việc mới hoặc gia nhập không gian hiện có qua mã ID.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowCreateWs(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
            >
              <Plus className="w-4 h-4" />
              Tạo không gian mới
            </button>
            
            <button
              onClick={() => setShowJoinWs(true)}
              className="w-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:text-white text-zinc-300 font-semibold py-3 px-5 rounded-xl active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none"
            >
              <Compass className="w-4 h-4" />
              Gia nhập không gian có sẵn
            </button>
          </div>
        </div>
      ) : activeWorkspaceId && channels.length === 0 ? (
        /* Active workspace has no channels state */
        <div className="bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 max-w-md w-full shadow-2xl relative z-10 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-zinc-950 border border-zinc-850 rounded-2xl flex items-center justify-center text-zinc-400 mb-6 mx-auto">
            <Layers className="w-8 h-8 text-indigo-400" />
          </div>
          
          <h3 className="text-xl font-bold text-white tracking-tight">Không gian của bạn còn trống</h3>
          <p className="text-zinc-400 text-xs mt-2.5 mb-8 leading-relaxed">
            Workspace này hiện tại chưa có kênh liên lạc nào. Hãy tạo kênh trò chuyện đầu tiên để bắt đầu kết nối với mọi người.
          </p>

          <button
            onClick={() => setShowCreateChan(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-5 rounded-xl shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer border-0 outline-none"
          >
            <Plus className="w-4 h-4" />
            Tạo kênh trò chuyện đầu tiên
          </button>
        </div>
      ) : (
        /* Default state when workspaces exist but none/no-channel is selected */
        <div className="max-w-sm relative z-10 animate-in fade-in duration-300">
          <div className="w-16 h-16 bg-zinc-900/80 border border-zinc-850 rounded-2xl flex items-center justify-center text-zinc-500 mb-5 mx-auto">
            <MessageSquare className="w-8 h-8 text-indigo-500/70" />
          </div>
          <h3 className="text-lg font-bold text-white">Chọn Workspace hoặc Kênh để bắt đầu</h3>
          <p className="text-zinc-500 text-xs mt-2 leading-relaxed">
            Chọn một Workspace ở sidebar bên trái và chọn kênh chat bất kỳ từ Content Explorer để bắt đầu thảo luận.
          </p>
        </div>
      )}
    </div>
  );
}
export default ChatViewportPlaceholders;
