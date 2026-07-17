import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage, WorkspaceMember } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CornerUpLeft, FileIcon, ArrowDownToLine, Loader2, MessageSquare, PhoneCall, Video, Copy, Check, FileText, FileCode, FileSpreadsheet, FileAudio, X, Smile } from 'lucide-react';
import { getAvatarGradient } from '@/lib/utils';
import { useChatStore } from '@/store/useChatStore';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

const renderTextWithMentions = (content: string, members: WorkspaceMember[]) => {
  if (!content) return content;

  // Extract all unique usernames and special terms
  const terms = new Set<string>();
  terms.add('here');
  terms.add('channel');
  terms.add('all');
  members.forEach((m) => {
    if (m.user?.username) {
      terms.add(m.user.username);
    }
  });

  // Convert to array and sort by length descending
  const sortedTerms = Array.from(terms).sort((a, b) => b.length - a.length);

  if (sortedTerms.length === 0) return content;

  // Escape special characters in usernames for regex safety
  const escapedTerms = sortedTerms.map((t) => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  
  // Regex to match (?:^|\s)@(term1|term2|...)
  const regex = new RegExp(`(^|\\s)@(${escapedTerms.join('|')})(?=\\b|\\s|$)`, 'g');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const prefix = match[1];
    const term = match[2];

    // Add preceding text
    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    // Add prefix space
    if (prefix) {
      parts.push(prefix);
    }

    // Add mention pill tag
    const isSpecial = term === 'here' || term === 'channel' || term === 'all';
    parts.push(
      <span
        key={matchIndex}
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold select-all mx-0.5 transition active:scale-95 duration-100 ${
          isSpecial
            ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 cursor-pointer'
            : 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 cursor-pointer'
        }`}
      >
        @{term}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < content.length) {
    parts.push(content.substring(lastIndex));
  }

  return parts.length > 0 ? parts : content;
};

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

const parseImageContent = (content: string) => {
  if (!content.startsWith('[image:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(7, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const httpMatch = urlsPart.match(/:(https?:\/\/)/);
  if (httpMatch && httpMatch.index !== undefined) {
    const originalUrl = urlsPart.slice(0, httpMatch.index);
    const thumbnailUrl = urlsPart.slice(httpMatch.index + 1);
    return { fileName, originalUrl, thumbnailUrl };
  }

  return { fileName, originalUrl: urlsPart, thumbnailUrl: undefined };
};

const parseFileContent = (content: string) => {
  if (!content.startsWith('[file:') || !content.endsWith(']')) {
    return null;
  }
  const inner = content.slice(6, -1);
  const firstColonIdx = inner.indexOf(':');
  if (firstColonIdx === -1) return null;
  const fileName = inner.slice(0, firstColonIdx);
  const urlsPart = inner.slice(firstColonIdx + 1);

  const lastColonIdx = urlsPart.lastIndexOf(':');
  if (lastColonIdx === -1) {
    return { fileName, url: urlsPart, size: 'Unknown' };
  }
  const url = urlsPart.slice(0, lastColonIdx);
  const size = urlsPart.slice(lastColonIdx + 1);

  return { fileName, url, size };
};

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf':
    case 'txt':
    case 'md':
    case 'log':
      return FileText;
    case 'csv':
    case 'xlsx':
    case 'xls':
      return FileSpreadsheet;
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
      return FileAudio;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return Video;
    case 'js':
    case 'ts':
    case 'tsx':
    case 'jsx':
    case 'go':
    case 'py':
    case 'java':
    case 'cpp':
    case 'c':
    case 'cs':
    case 'html':
    case 'css':
    case 'json':
    case 'yaml':
    case 'yml':
      return FileCode;
    default:
      return FileIcon;
  }
};

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

  const activeWorkspaceId = useChatStore((state) => state.activeWorkspaceId);

  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', activeWorkspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${activeWorkspaceId}/members`);
      return res.data;
    },
    enabled: !!activeWorkspaceId,
  });

  const [showPicker, setShowPicker] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyText = () => {
    navigator.clipboard.writeText(msg.content);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  const handleToggleReaction = async (emoji: string) => {
    const reaction = msg.reactions?.find((r) => r.emoji === emoji);
    const hasMe = reaction?.me;

    const url = `/channels/${msg.channel_id}/messages/${msg.id}/reactions`;
    const payload = {
      emoji,
      content: msg.content,
      username: msg.username,
      user_id: msg.user_id,
      timestamp: typeof msg.timestamp === 'string' ? new Date(msg.timestamp).getTime() : msg.timestamp,
    };

    try {
      if (hasMe) {
        await api.delete(url, { data: payload });
      } else {
        await api.post(url, payload);
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  const renderReactions = () => {
    if (!msg.reactions || msg.reactions.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1.5 mt-2 animate-in fade-in duration-100 select-none">
        {msg.reactions.map((reaction) => {
          const count = reaction.usernames.length;
          if (count === 0) return null;

          const hasMe = reaction.me;
          const hoverText = reaction.usernames.join(', ') + ' đã phản hồi';

          return (
            <button
              key={reaction.emoji}
              onClick={() => handleToggleReaction(reaction.emoji)}
              title={hoverText}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-xs font-medium cursor-pointer transition-all duration-150 active:scale-95 shadow-sm group/react-pill ${
                hasMe
                  ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/35 hover:bg-indigo-500/25'
                  : 'bg-zinc-950/40 text-zinc-400 border-zinc-850 hover:bg-zinc-850 hover:text-zinc-200'
              }`}
            >
              <span className="text-sm scale-100 group-hover/react-pill:scale-110 transition duration-150">{reaction.emoji}</span>
              <span className="text-[10px] font-bold">{count}</span>
            </button>
          );
        })}
      </div>
    );
  };

  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (!lightboxOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  const isCallMessage = !!msg.content.match(/^\[call:(voice|video):active\]/);

  // Reactively subscribe to active call participants query cache
  const { data: callParticipants = [] } = useQuery<any[]>({
    queryKey: ['call-participants', msg.channel_id],
    queryFn: async () => {
      const activeWorkspaceId = useChatStore.getState().activeWorkspaceId;
      if (!msg.channel_id || !activeWorkspaceId) return [];
      try {
        const res = await api.get(`/workspaces/${activeWorkspaceId}/channels/${msg.channel_id}/participants`);
        return res.data;
      } catch (e) {
        return [];
      }
    },
    enabled: isCallMessage && !!msg.channel_id,
    staleTime: 3000,
  });

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
  const parsedImage = parseImageContent(msg.content);
  const parsedFile = parseFileContent(msg.content);
  const uploadingMatch = msg.content.match(/^\[uploading:([^\]]+)\]/);
  const callVoiceMatch = msg.content.match(/^\[call:voice:active\]/);
  const callVideoMatch = msg.content.match(/^\[call:video:active\]/);

  // Render message body content based on parsed type
  const renderContent = () => {
    if (callVoiceMatch || callVideoMatch) {
      const isVideo = !!callVideoMatch;
      const queryClient = useQueryClient();
      const channelMessages = queryClient.getQueryData<ChatMessage[]>(['messages', msg.channel_id]) || [];
      const latestCallMsg = [...channelMessages]
        .reverse()
        .find(m => m.content.match(/^\[call:(voice|video):active\]/));
      const isLatestCall = latestCallMsg ? latestCallMsg.id === msg.id : true;
      const isCallActive = (callParticipants.length > 0 && isLatestCall) || useChatStore.getState().activeVoiceChannelId === msg.channel_id;
      const isUserInCall = useChatStore.getState().activeVoiceChannelId === msg.channel_id;

      return (
        <div className="mt-2 flex items-center justify-between p-3.5 bg-zinc-950/50 rounded-2xl border border-zinc-800/80 max-w-sm hover:border-indigo-500/20 transition shadow-lg backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isCallActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse'
                : 'bg-zinc-900 border-zinc-800 text-zinc-450'
            }`}>
              {isVideo ? <Video className="w-5 h-5" /> : <PhoneCall className="w-5 h-5" />}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white">
                Cuộc gọi {isVideo ? 'video' : 'thoại'} đã bắt đầu
              </div>
              <div className="text-[10px] text-zinc-550 mt-0.5">
                {isUserInCall
                  ? 'Đang diễn ra • Bạn đã tham gia'
                  : isCallActive 
                    ? 'Đang diễn ra • Nhấp tham gia ngay' 
                    : 'Đã kết thúc cuộc gọi'}
              </div>
            </div>
          </div>
          
          {isUserInCall ? (
            <div className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-emerald-500/20 text-emerald-400 bg-emerald-500/5 select-none font-medium">
              Đã tham gia
            </div>
          ) : (
            <button
              onClick={() => {
                useChatStore.getState().setActiveVoiceChannelId(msg.channel_id);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition border-0 active:scale-95 outline-none ${
                isCallActive
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/10'
                  : 'bg-zinc-850 hover:bg-zinc-800 text-zinc-300'
              }`}
            >
              {isCallActive ? 'Tham gia' : 'Gọi lại'}
            </button>
          )}
        </div>
      );
    }

    if (parsedImage) {
      const { fileName, originalUrl, thumbnailUrl } = parsedImage;
      const displayUrl = thumbnailUrl || originalUrl;
      return (
        <div className="mt-2 group/img relative max-w-sm rounded-xl overflow-hidden border border-zinc-800 shadow-md">
          <img 
            src={displayUrl} 
            alt={fileName} 
            className="w-full object-cover max-h-[220px] transition-transform duration-300 hover:scale-[1.02] cursor-zoom-in"
            onClick={() => setLightboxOpen(true)}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/60 to-transparent opacity-0 group-hover/img:opacity-100 transition duration-150 flex items-end p-2 justify-between pointer-events-none">
            <span className="text-[10px] text-zinc-300 font-mono truncate max-w-[160px] pointer-events-auto">{fileName}</span>
            <div className="flex items-center gap-1 pointer-events-auto">
              <button
                onClick={() => handleCopyLink(originalUrl)}
                className="p-1.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-lg text-white transition active:scale-95 cursor-pointer border-0 outline-none"
                title="Sao chép liên kết"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <a 
                href={originalUrl} 
                download 
                target="_blank" 
                rel="noreferrer" 
                className="p-1.5 bg-zinc-900/80 hover:bg-indigo-600 rounded-lg text-white transition active:scale-95 flex items-center justify-center"
                title="Tải ảnh gốc"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      );
    }

    if (parsedFile) {
      const { fileName, url, size } = parsedFile;
      const FileIconComponent = getFileIcon(fileName);
      return (
        <div className="mt-2 flex items-center justify-between p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 hover:border-zinc-700/80 transition max-w-sm shadow-inner group/file duration-150">
          <div className="flex items-center gap-3 truncate min-w-0">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 transition group-hover/file:text-indigo-400 group-hover/file:border-zinc-700">
              <FileIconComponent className="w-5 h-5" />
            </div>
            <div className="truncate text-left">
              <div className="text-xs font-semibold text-zinc-200 truncate group-hover/file:text-white transition duration-150">{fileName}</div>
              <div className="text-[9px] text-zinc-500 font-mono mt-0.5">{size}</div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 ml-4">
            <button
              onClick={() => handleCopyLink(url)}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition outline-none border-0 cursor-pointer active:scale-95"
              title="Sao chép liên kết"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <a
              href={url}
              download
              target="_blank"
              rel="noreferrer"
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition outline-none border-0 cursor-pointer active:scale-95 flex items-center justify-center"
              title="Tải tệp tin"
            >
              <ArrowDownToLine className="w-4 h-4" />
            </a>
          </div>
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
        {renderTextWithMentions(msg.content, members)}
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
          {renderReactions()}
        </div>

        {/* Floating Quick Action Bar on Hover */}
        {!hideReply && (
          <div className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition absolute right-3 -top-3 flex items-center bg-zinc-950 border border-zinc-800 shadow-xl rounded-xl p-1 z-20 duration-150 animate-in fade-in slide-in-from-bottom-1 gap-0.5">
            {/* Quick Reactions */}
            {['👍', '👀', '✅'].map((emoji) => {
              const reaction = msg.reactions?.find((r) => r.emoji === emoji);
              const hasMe = reaction?.me;
              return (
                <button
                  key={emoji}
                  onClick={() => handleToggleReaction(emoji)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 transition active:scale-90 cursor-pointer border-0 outline-none ${
                    hasMe ? 'bg-indigo-600/10 text-indigo-400' : 'text-zinc-400'
                  }`}
                  title={emoji === '👍' ? 'Like' : emoji === '👀' ? 'Looking' : 'Completed'}
                >
                  <span className="text-sm">{emoji}</span>
                </button>
              );
            })}

            {/* Separator */}
            <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

            {/* Add reaction trigger */}
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none ${
                showPicker ? 'bg-zinc-800 text-white' : ''
              }`}
              title="Thêm phản hồi"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Reply trigger */}
            <button
              onClick={() => onReplyClick(msg)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none"
              title="Trả lời luồng"
            >
              <CornerUpLeft className="w-4 h-4" />
            </button>

            {/* Copy message text */}
            <button
              onClick={handleCopyText}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition active:scale-90 cursor-pointer border-0 outline-none"
              title="Sao chép văn bản"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* Emoji Picker Popover */}
        {showPicker && (
          <div className="absolute right-3 top-6 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl p-2.5 z-30 flex gap-1.5 flex-wrap max-w-[220px] animate-in fade-in slide-in-from-top-2 duration-150">
            {['😀', '😂', '🔥', '👍', '❤️', '🎉', '🚀', '👀', '💯', '✨', '💻', '🙌', '✅'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  handleToggleReaction(emoji);
                  setShowPicker(false);
                }}
                className="text-base p-1.5 hover:bg-zinc-800 rounded-lg transition active:scale-90 cursor-pointer outline-none border-0"
              >
                {emoji}
              </button>
            ))}
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

      {/* 4. Image Lightbox Modal overlay (using React Portal to render into document.body to bypass absolute container transforms) */}
      {lightboxOpen && parsedImage && createPortal(
        <div 
          className="fixed inset-0 bg-zinc-950/90 backdrop-blur-md z-[9999] flex flex-col justify-between p-4 animate-in fade-in duration-200"
          onClick={() => setLightboxOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between h-14 px-4 w-full shrink-0 select-none">
            <span className="text-zinc-250 text-xs font-semibold truncate max-w-[80%] font-mono">
              {parsedImage.fileName}
            </span>
            <button
              onClick={() => setLightboxOpen(false)}
              className="p-2 bg-zinc-900/60 hover:bg-zinc-800/80 hover:text-white text-zinc-400 rounded-full transition cursor-pointer border-0 outline-none active:scale-95 flex items-center justify-center"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Image */}
          <div 
            className="flex-1 flex items-center justify-center min-h-0 w-full overflow-hidden p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <img 
              src={parsedImage.originalUrl} 
              alt={parsedImage.fileName} 
              className="max-w-[90vw] max-h-[75vh] object-contain rounded-lg shadow-2xl select-none animate-in zoom-in-95 duration-250"
            />
          </div>

          {/* Footer actions */}
          <div 
            className="flex items-center justify-center gap-3 h-16 w-full select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleCopyLink(parsedImage.originalUrl)}
              className="px-4 py-2 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-350 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 border-0 outline-none cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-450" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Sao chép liên kết</span>
            </button>
            <a
              href={parsedImage.originalUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer text-center flex items-center"
            >
              <ArrowDownToLine className="w-3.5 h-3.5 mr-1" />
              <span>Tải ảnh gốc</span>
            </a>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
