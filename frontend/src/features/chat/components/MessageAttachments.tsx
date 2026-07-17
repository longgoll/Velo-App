import { useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Video, PhoneCall, Copy, Check, ArrowDownToLine, Loader2 } from 'lucide-react';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import type { ChatMessage, WorkspaceMember } from '@/types';
import { getFileIcon } from '../utils/mediaUtils';

// 1. MentionTextRenderer
interface MentionTextRendererProps {
  content: string;
  members: WorkspaceMember[];
  isSelf: boolean;
}

export function MentionTextRenderer({ content, members, isSelf }: MentionTextRendererProps) {
  if (!content) return null;

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

  const sortedTerms = Array.from(terms).sort((a, b) => b.length - a.length);

  if (sortedTerms.length === 0) {
    return <>{content}</>;
  }

  // Escape special characters in usernames for regex safety
  const escapedTerms = sortedTerms.map((t) => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
  
  // Regex to match (?:^|\s)@(term1|term2|...)
  const regex = new RegExp(`(^|\\s)@(${escapedTerms.join('|')})(?=\\b|\\s|$)`, 'g');

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    const matchIndex = match.index;
    const prefix = match[1];
    const term = match[2];

    if (matchIndex > lastIndex) {
      parts.push(content.substring(lastIndex, matchIndex));
    }

    if (prefix) {
      parts.push(prefix);
    }

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

  return (
    <div className={`mt-1 px-3.5 py-1.5 rounded-2xl inline-block max-w-[85%] text-sm select-text break-words leading-relaxed ${
      isSelf
        ? 'bg-indigo-650 text-white shadow-sm shadow-indigo-600/10'
        : 'bg-zinc-100 border border-zinc-200/60 text-zinc-800 dark:bg-zinc-950/45 dark:border-zinc-850 dark:text-zinc-300'
    }`}>
      {parts.length > 0 ? parts : content}
    </div>
  );
}

// 2. CallAttachment
interface CallAttachmentProps {
  msg: ChatMessage;
  callVideoMatch: boolean;
}

export function CallAttachment({ msg, callVideoMatch }: CallAttachmentProps) {
  const isVideo = !!callVideoMatch;
  const queryClient = useQueryClient();

  // Query call participants
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
    enabled: !!msg.channel_id,
    staleTime: 3000,
  });

  const channelMessagesRaw = queryClient.getQueryData<{ pages: ChatMessage[][] }>(['messages', msg.channel_id]);
  const channelMessages: ChatMessage[] = channelMessagesRaw?.pages ? channelMessagesRaw.pages.flat() : [];
  const latestCallMsg = [...channelMessages]
    .reverse()
    .find((m) => m.content.match(/^\[call:(voice|video):active\]/));
  const isLatestCall = latestCallMsg ? latestCallMsg.id === msg.id : true;
  const isCallActive = (callParticipants.length > 0 && isLatestCall) || useChatStore.getState().activeVoiceChannelId === msg.channel_id;
  const isUserInCall = useChatStore.getState().activeVoiceChannelId === msg.channel_id;

  return (
    <div className="mt-2 flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-200 dark:bg-zinc-950/40 dark:border-zinc-800/80 max-w-sm hover:border-indigo-500/20 transition shadow-lg backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
          isCallActive 
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 animate-pulse'
            : 'bg-white border-zinc-200 text-zinc-450 dark:bg-zinc-900 dark:border-zinc-800'
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

// 3. ImageAttachment
interface ImageAttachmentProps {
  fileName: string;
  originalUrl: string;
  thumbnailUrl?: string;
  onOpenLightbox: () => void;
}

export function ImageAttachment({ fileName, originalUrl, thumbnailUrl, onOpenLightbox }: ImageAttachmentProps) {
  const [copied, setCopied] = useState(false);
  const displayUrl = thumbnailUrl || originalUrl;

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 group/img relative max-w-sm rounded-xl overflow-hidden border border-zinc-800 shadow-md">
      <img 
        src={displayUrl} 
        alt={fileName} 
        className="w-full object-cover max-h-[220px] transition-transform duration-300 hover:scale-[1.02] cursor-zoom-in"
        onClick={onOpenLightbox}
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

// 4. FileAttachment
interface FileAttachmentProps {
  fileName: string;
  url: string;
  size: string;
}

export function FileAttachment({ fileName, url, size }: FileAttachmentProps) {
  const [copied, setCopied] = useState(false);
  const FileIconComponent = getFileIcon(fileName);

  const handleCopyLink = (linkUrl: string) => {
    navigator.clipboard.writeText(linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 flex items-center justify-between p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 hover:border-zinc-700/80 transition max-w-sm shadow-inner group/file duration-150">
      <div className="flex items-center gap-3 truncate min-w-0">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0 transition group-hover/file:text-indigo-400 group-hover/file:border-zinc-700">
          <FileIconComponent className="w-5 h-5" />
        </div>
        <div className="truncate text-left">
          <div className="text-xs font-semibold text-zinc-200 truncate group-hover/file:text-white transition duration-150">{fileName}</div>
          <div className="text-[9px] text-zinc-550 font-mono mt-0.5">{size}</div>
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

// 5. UploadingAttachment
interface UploadingAttachmentProps {
  fileName: string;
  progress: number;
}

export function UploadingAttachment({ fileName, progress }: UploadingAttachmentProps) {
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
        <span className="text-[10px] text-zinc-550 font-mono">{progress}%</span>
      </div>
    </div>
  );
}
