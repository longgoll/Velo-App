import React, { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface ChatInputProps {
  activeChannelId: string;
  channelName: string;
  onSendMessage: (channelId: string, content: string) => void;
}

export default function ChatInput({
  activeChannelId,
  channelName,
  onSendMessage,
}: ChatInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeChannelId) return;
    onSendMessage(activeChannelId, text.trim());
    setText('');
  };

  return (
    <div className="px-6 pb-6">
      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-zinc-800/80 rounded-xl px-4 py-2 flex items-center gap-3 shadow-inner"
      >
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Gửi tin nhắn đến #${channelName}`}
          className="flex-1 bg-transparent border-0 text-white focus-visible:ring-0 focus-visible:ring-offset-0 px-0 text-sm placeholder-zinc-500 h-9"
        />
        <Button
          type="submit"
          size="icon"
          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg h-8 w-8 flex items-center justify-center shadow transition active:scale-95 shrink-0"
          disabled={!text.trim()}
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
