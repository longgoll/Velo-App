import React, { useState, useRef } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);
    if (onTyping && val.trim() && Date.now() - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = Date.now();
      onTyping();
    }
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
    // Reset file input value
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
    <div className="px-6 pb-6 relative shrink-0">
      
      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-20 right-6 bg-zinc-950 border border-zinc-850 rounded-xl shadow-2xl p-2.5 z-20 flex gap-1.5 flex-wrap max-w-[220px] animate-in fade-in slide-in-from-bottom-2 duration-150">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => selectEmoji(emoji)}
              className="text-base p-1.5 hover:bg-zinc-800 rounded-lg transition active:scale-90 cursor-pointer outline-none border-0"
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
        className="bg-zinc-900 border border-zinc-850 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner hover:border-zinc-800 focus-within:border-zinc-700/80 transition"
      >
        {/* Attachment paperclip trigger */}
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
          placeholder={`Gửi tin nhắn đến #${channelName}`}
          className="flex-1 bg-transparent border-0 text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm placeholder-zinc-500 h-9 outline-none"
        />

        {/* Emoji trigger */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className={`p-1.5 hover:bg-zinc-800 rounded-lg transition outline-none border-0 cursor-pointer ${showEmojiPicker ? 'text-indigo-400 bg-zinc-800' : 'text-zinc-500 hover:text-zinc-200'}`}
          title="Chọn emoji"
        >
          <Smile className="w-4 h-4" />
        </button>

        <Button
          type="submit"
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg h-8 w-8 flex items-center justify-center shadow transition active:scale-95 shrink-0 cursor-pointer"
          disabled={!text.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
