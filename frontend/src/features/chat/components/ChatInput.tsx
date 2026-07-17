import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, Megaphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatStore } from '@/store/useChatStore';
import { getAvatarGradient } from '@/lib/utils';
import { useMentionAutocomplete } from '../hooks/useMentionAutocomplete';

const EMOJIS = ['😀', '😂', '🔥', '👍', '❤️', '🎉', '🚀', '👀', '💯', '✨', '💻', '🙌'];

interface ChatInputProps {
  activeChannelId: string;
  channelName: string;
  onSendMessage: (channelId: string, content: string) => void;
  onFileUpload?: (file: File) => void;
  onTyping?: () => void;
}

export default function ChatInput({
  activeChannelId,
  channelName,
  onSendMessage,
  onFileUpload,
  onTyping,
}: ChatInputProps) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTypingSentRef = useRef<number>(0);

  const { activeWorkspaceId } = useChatStore();
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;

  // Use the extracted Mention Autocomplete hook
  const {
    mentionQuery,
    selectedIndex,
    setSelectedIndex,
    filteredSuggestions,
    handleSelectSuggestion,
    handleKeyDown,
    updateMentionStatus,
  } = useMentionAutocomplete({
    activeWorkspaceId,
    channelId: activeChannelId,
    currentUser,
    text,
    setText,
    inputRef,
  });

  // Close emoji picker on click outside
  useEffect(() => {
    if (!showEmojiPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.emoji-picker-container') && !target.closest('.emoji-picker-trigger')) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showEmojiPicker]);

  const autoTransformEmotes = (val: string): string => {
    const isAutoEmote = localStorage.getItem('chat_auto_emote') !== 'false';
    if (!isAutoEmote) return val;

    const emotesMap: Record<string, string> = {
      ':)': '🙂',
      ':-)': '🙂',
      ':D': '😄',
      ':-D': '😄',
      ':(': '🥺',
      ':-(': '🥺',
      '<3': '❤️',
      ';)': '😉',
      ';-)': '😉',
      'B)': '😎',
      'B-)': '😎',
      ':P': '😛',
      ':-P': '😛',
    };

    let result = val;
    for (const [emote, emoji] of Object.entries(emotesMap)) {
      const escaped = emote.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), emoji);
    }
    return result;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const val = autoTransformEmotes(rawVal);
    setText(val);
    if (onTyping && val.trim() && Date.now() - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = Date.now();
      onTyping();
    }
    const cursor = e.target.selectionStart;
    updateMentionStatus(val, cursor);
    setSelectedIndex(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChannelId) return;
    onSendMessage(activeChannelId, text.trim());
    setText('');
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files[0]);
    }
    e.target.value = '';
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const selectEmoji = (emoji: string) => {
    setText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  return (
    <div className="px-6 bg-white dark:bg-zinc-950/90 border-t border-zinc-200 dark:border-zinc-950/60 relative shrink-0 h-[52px] flex items-center shadow-[0_-2px_10px_rgba(0,0,0,0.03)] dark:shadow-none">
      
      {/* Mention Auto-complete popover */}
      {mentionQuery !== null && filteredSuggestions.length > 0 && (
        <div className="absolute bottom-[60px] left-6 right-6 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-2xl shadow-2xl overflow-hidden max-h-[260px] overflow-y-auto z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex flex-col">
            {filteredSuggestions.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isSpecial = item.type === 'special';
              const isInChannel = item.inChannel !== false;

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectSuggestion(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-4.5 py-3 cursor-pointer transition-colors duration-150 border-b border-zinc-900/50 last:border-0 ${
                    isSelected ? 'bg-zinc-800/80 text-white' : 'text-zinc-300 hover:bg-zinc-900/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {isSpecial ? (
                      <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Megaphone className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs text-white border border-white/5 shadow-sm ${getAvatarGradient(item.label)}`}>
                          {item.label.slice(0, 1).toUpperCase()}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                          item.isOnline ? 'bg-emerald-500' : 'bg-zinc-550'
                        }`} />
                      </div>
                    )}

                    <div className="flex flex-col min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs truncate">
                          {isSpecial ? `@${item.label}` : item.label}
                        </span>
                        {!isSpecial && item.isOnline && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        )}
                      </div>
                      <span className="text-[10px] text-zinc-500 truncate">
                        {isSpecial ? item.description : item.email}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!isInChannel && (
                      <span className="text-[9px] font-semibold text-zinc-550 tracking-wide uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-850 rounded-md shadow-sm">
                        Không có trong kênh
                      </span>
                    )}
                    {isSelected && (
                      <span className="text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded shadow-sm">
                        Enter
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-[60px] right-6 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl p-2.5 z-20 flex gap-1.5 flex-wrap max-w-[220px] emoji-picker-container animate-in fade-in slide-in-from-bottom-2 duration-150">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => selectEmoji(emoji)}
              className="text-base p-1.5 hover:bg-zinc-800 rounded-lg transition active:scale-90 cursor-pointer outline-none border-0 emoji-picker-trigger"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />

      <form
        onSubmit={handleSubmit}
        className="w-full bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-lg px-3 flex items-center gap-3 shadow-inner hover:border-zinc-300 dark:hover:border-zinc-700 focus-within:border-indigo-500/30 transition h-9"
      >
        {onFileUpload && (
          <button
            type="button"
            onClick={triggerFileSelect}
            className="p-1.5 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 rounded-lg transition outline-none border-0 cursor-pointer"
            title="Đính kèm tệp tin"
          >
            <Paperclip className="w-4 h-4" />
          </button>
        )}

        <Input
          type="text"
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onKeyUp={(e) => {
            const cursor = (e.target as HTMLInputElement).selectionStart;
            updateMentionStatus(text, cursor);
          }}
          onSelect={(e) => {
            const cursor = (e.target as HTMLInputElement).selectionStart;
            updateMentionStatus(text, cursor);
          }}
          onClick={(e) => {
            const cursor = (e.target as HTMLInputElement).selectionStart;
            updateMentionStatus(text, cursor);
          }}
          placeholder={`Gửi tin nhắn đến #${channelName}`}
          className="flex-1 bg-transparent border-0 text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm placeholder-zinc-500 h-full outline-none"
        />

        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-1.5 hover:bg-zinc-800 rounded-lg transition outline-none border-0 cursor-pointer emoji-picker-trigger ${showEmojiPicker ? 'text-indigo-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-200'}`}
          title="Chọn emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        {localStorage.getItem('chat_show_send_button') !== 'false' && (
          <Button
            type="submit"
            size="icon"
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg h-7 w-7 flex items-center justify-center shadow transition active:scale-95 shrink-0 cursor-pointer"
            disabled={!text.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        )}
      </form>
    </div>
  );
}
