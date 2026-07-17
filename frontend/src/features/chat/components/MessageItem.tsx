import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ChatMessage, WorkspaceMember } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Copy, Check, ArrowDownToLine, X, Pin } from 'lucide-react';
import { getAvatarGradient } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { parseImageContent, parseFileContent } from '../utils/mediaUtils';
import {
  CallAttachment,
  ImageAttachment,
  FileAttachment,
  UploadingAttachment,
  MentionTextRenderer,
} from './MessageAttachments';
import MessageReactions from './MessageReactions';
import MessageQuickActions from './MessageQuickActions';

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
  members: WorkspaceMember[];
  isReplyChild?: boolean;
  unreadTimestamp?: string | number | null;
  isActiveThread?: boolean;
  hideReply?: boolean;
  isHighlighted?: boolean;
  isPinned?: boolean;
  pinId?: string;
}

// Safe timestamp conversion helper — hoisted ra ngoài component
const getTimestampNum = (ts: string | number | null | undefined): number | null => {
  if (ts === null || ts === undefined) return null;
  return typeof ts === 'string' ? new Date(ts).getTime() : ts;
};

function MessageItemInner({
  msg,
  onReplyClick,
  members,
  isReplyChild = false,
  unreadTimestamp = null,
  isActiveThread = false,
  hideReply = false,
  isHighlighted = false,
  isPinned = false,
  pinId,
}: MessageItemProps) {
  const currentUser = useCurrentUser();

  const [copied, setCopied] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const handleCopyLink = useCallback((url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

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
      return (
        <CallAttachment
          msg={msg}
          callVideoMatch={!!callVideoMatch}
        />
      );
    }

    if (parsedImage) {
      return (
        <ImageAttachment
          fileName={parsedImage.fileName}
          originalUrl={parsedImage.originalUrl}
          thumbnailUrl={parsedImage.thumbnailUrl}
          onOpenLightbox={() => setLightboxOpen(true)}
        />
      );
    }

    if (parsedFile) {
      return (
        <FileAttachment
          fileName={parsedFile.fileName}
          url={parsedFile.url}
          size={parsedFile.size}
        />
      );
    }

    if (uploadingMatch || msg.isUploading) {
      const fileName = msg.fileName || uploadingMatch?.[1] || 'Đang tải lên...';
      const progress = msg.uploadProgress ?? 0;
      return <UploadingAttachment fileName={fileName} progress={progress} />;
    }

    const isSelf = msg.user_id === currentUser?.id;
    return (
      <MentionTextRenderer
        content={msg.content}
        members={members}
        isSelf={isSelf}
      />
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
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-550 ml-12 mb-1.5 select-none font-medium">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Trả lời từ</span>
          <span className="text-indigo-400">@{msg.parentUsername}</span>
        </div>
      )}
      {/* Pinned Message Indicator */}
      {isPinned && (
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 ml-12 mb-1 select-none font-semibold animate-in fade-in slide-in-from-top-1 duration-200">
          <Pin className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Tin nhắn đã ghim</span>
        </div>
      )}
      {/* 2. Main Message Container */}
      <div className={`flex gap-4 items-start group p-2 rounded-xl transition duration-150 relative w-full ${
        isHighlighted
          ? 'animate-message-highlight border'
          : isActiveThread
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
          <MessageReactions msg={msg} />
        </div>

        {/* Floating Quick Action Bar on Hover & Emoji Picker */}
        <MessageQuickActions
          msg={msg}
          onReplyClick={onReplyClick}
          hideReply={hideReply}
          isPinned={isPinned}
          pinId={pinId}
          members={members}
        />
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

      {/* 4. Image Lightbox Modal overlay */}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-indigo-600/10 cursor-pointer text-center"
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

export default React.memo(MessageItemInner, (prev, next) => {
  // Custom comparator — chỉ re-render khi data thực sự thay đổi
  return (
    prev.msg === next.msg &&
    prev.isActiveThread === next.isActiveThread &&
    prev.unreadTimestamp === next.unreadTimestamp &&
    prev.members === next.members &&
    prev.hideReply === next.hideReply &&
    prev.isReplyChild === next.isReplyChild &&
    prev.isPinned === next.isPinned &&
    prev.pinId === next.pinId
  );
});
