import type { ChatMessage } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CornerUpLeft, FileIcon, ArrowDownToLine, Loader2, MessageSquare } from 'lucide-react';
import { getAvatarGradient } from '@/lib/utils';

interface ExtendedChatMessage extends ChatMessage {
  parentId?: string;
  parentUsername?: string;
  replies?: ExtendedChatMessage[];
  uploadProgress?: number;
  fileName?: string;
  isUploading?: boolean;
}

interface MessageItemProps {
  msg: ExtendedChatMessage;
  onReplyClick: (msg: ChatMessage) => void;
  isReplyChild?: boolean;
  unreadTimestamp?: string | number | null;
  isActiveThread?: boolean;
  hideReply?: boolean;
}

export default function MessageItem({
  msg,
  onReplyClick,
  isReplyChild = false,
  unreadTimestamp = null,
  isActiveThread = false,
  hideReply = false
}: MessageItemProps) {

  // Retrieve current user from local storage
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Safe timestamp conversion helper
  const getTimestampNum = (ts: string | number | null | undefined): number | null => {
    if (ts === null || ts === undefined) return null;
    return typeof ts === 'string' ? new Date(ts).getTime() : ts;
  };

  const msgTime = getTimestampNum(msg.timestamp);
  const unreadTime = getTimestampNum(unreadTimestamp);
  const isUnread = unreadTime !== null && msgTime !== null && msgTime >= unreadTime && msg.user_id !== currentUser?.id;

  const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Parse custom media types
  const imageMatch = msg.content.match(/^\[image:([^:]+):([^\]]+)\]/);
  const fileMatch = msg.content.match(/^\[file:([^:]+):([^\]]+)\]/);
  const uploadingMatch = msg.content.match(/^\[uploading:([^\]]+)\]/);

  // Render message body content based on parsed type
  const renderContent = () => {
    if (imageMatch) {
      const [_, fileName, url] = imageMatch;
      return (
        <div className="mt-2 group/img relative max-w-sm rounded-xl overflow-hidden border border-zinc-800 shadow-md">
          <img src={url} alt={fileName} className="w-full object-cover max-h-[220px] transition-transform duration-300 hover:scale-[1.02]" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent opacity-0 group-hover/img:opacity-100 transition duration-150 flex items-end p-2 justify-between">
            <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[200px]">{fileName}</span>
            <a href={url} download target="_blank" rel="noreferrer" className="p-1.5 bg-zinc-900/80 hover:bg-indigo-600 rounded-lg text-white transition">
              <ArrowDownToLine className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      );
    }

    if (fileMatch) {
      const [_, fileName, fileSize] = fileMatch;
      return (
        <div className="mt-2 flex items-center justify-between p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 max-w-sm hover:border-zinc-700/80 transition shadow-inner">
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
              <FileIcon className="w-5 h-5" />
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-zinc-200 truncate">{fileName}</div>
              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{fileSize}</div>
            </div>
          </div>
          <button className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition outline-none border-0 cursor-pointer">
            <ArrowDownToLine className="w-4 h-4" />
          </button>
        </div>
      );
    }

    if (uploadingMatch || msg.isUploading) {
      const fileName = msg.fileName || uploadingMatch?.[1] || 'Đang tải lên...';
      const progress = msg.uploadProgress ?? 0;
      return (
        <div className="mt-2 p-3 bg-zinc-950/20 rounded-xl border border-zinc-850 max-w-sm">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-indigo-400 animate-spin shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <div className="text-xs text-zinc-300 truncate">{fileName}</div>
              <div className="w-full bg-zinc-900 rounded-full h-1 mt-2 overflow-hidden border border-zinc-800">
                <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">{progress}%</span>
          </div>
        </div>
      );
    }

    return (
      <p className="text-zinc-300 text-sm mt-1 select-text break-words leading-relaxed">
        {msg.content}
      </p>
    );
  };

  const replies = msg.replies || [];
  const hasReplies = replies.length > 0;

  const hasUnreadReplies = replies.some(
    (reply) =>
      unreadTime !== null &&
      getTimestampNum(reply.timestamp) !== null &&
      getTimestampNum(reply.timestamp)! >= unreadTime &&
      reply.user_id !== currentUser?.id
  );

  return (
    <div className="flex flex-col w-full">
      {/* 1. If parent is not in the list, render thread context preview bar */}
      {!isReplyChild && msg.parentUsername && (
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 ml-12 mb-1.5 select-none font-medium">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Trả lời từ</span>
          <span className="text-indigo-400">@{msg.parentUsername}</span>
        </div>
      )}
      {/* 2. Main Message Container */}
      <div className={`flex gap-4 items-start group p-2 rounded-xl transition duration-150 relative w-full ${isActiveThread
          ? 'bg-indigo-950/25 border border-indigo-500/25 shadow-[inset_0_0_8px_rgba(99,102,241,0.04)]'
          : 'hover:bg-zinc-800/10 border border-transparent'
        }`}>
        <Avatar size="lg" className="shrink-0">
          <AvatarFallback className={`font-bold select-none text-sm shadow-inner ${getAvatarGradient(msg.username)}`}>
            {msg.username.slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-zinc-200 text-sm hover:underline cursor-pointer select-text">
              {msg.username}
            </span>
            <span className="text-[9px] text-zinc-500 font-medium select-none flex items-center gap-1.5">
              {timeString}
              {isUnread && (
                <span className="text-rose-500 font-bold text-[9px] tracking-wider uppercase animate-pulse select-none bg-rose-500/10 px-1 rounded border border-rose-500/20 shadow-sm shadow-rose-500/5">
                  • mới
                </span>
              )}
            </span>
          </div>

          {renderContent()}
        </div>

        {/* Floating Quick Action Button on Hover */}
        {!hideReply && (
          <div className="opacity-0 group-hover:opacity-100 transition absolute right-3 top-2 flex items-center bg-zinc-950 border border-zinc-800 shadow-md rounded-lg p-0.5 overflow-hidden z-10 duration-200">
            <button
              onClick={() => onReplyClick(msg)}
              className="p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-md transition outline-none border-0 cursor-pointer flex items-center gap-1 text-[10px] font-semibold"
              title="Trả lời"
            >
              <CornerUpLeft className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Render Thread Reply Summary Pill */}
      {!isReplyChild && hasReplies && (
        <button
          onClick={() => onReplyClick(msg)}
          className={`self-start ml-12 mt-1.5 flex items-center gap-2 px-2.5 py-1 rounded-lg transition-all duration-200 group text-xs font-semibold cursor-pointer outline-none shrink-0 ${
            hasUnreadReplies 
              ? 'bg-rose-950/20 hover:bg-rose-900/30 text-rose-450 border border-rose-500/30' 
              : 'bg-zinc-950/40 hover:bg-indigo-950/20 text-zinc-400 hover:text-indigo-400 border border-zinc-850 hover:border-indigo-500/20'
          }`}
        >
          <div className="flex -space-x-1 mr-1.5 select-none">
            {Array.from(new Set(replies.map((r) => r.username)))
              .slice(0, 3)
              .map((username) => (
                <div
                  key={username}
                  className={`w-4.5 h-4.5 rounded-full border border-zinc-900 flex items-center justify-center text-[8px] font-bold text-white shadow-sm shrink-0 ${getAvatarGradient(username)}`}
                  title={username}
                >
                  {username.slice(0, 1).toUpperCase()}
                </div>
              ))}
          </div>
          <MessageSquare className={`w-3.5 h-3.5 transition shrink-0 ${hasUnreadReplies ? 'text-rose-500 group-hover:text-rose-400' : 'text-zinc-500 group-hover:text-indigo-400'}`} />
          <span>{replies.length} câu trả lời</span>
          {hasUnreadReplies && (
            <span className="text-rose-500 font-bold text-[8px] tracking-wider uppercase animate-pulse select-none bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 ml-1">
              mới
            </span>
          )}
          <span className={`text-[10px] ml-0.5 font-normal transition ${hasUnreadReplies ? 'text-rose-500/70 group-hover:text-rose-400' : 'text-zinc-650 group-hover:text-indigo-400/80'}`}>• Xem luồng</span>
        </button>
      )}
    </div>
  );
}
