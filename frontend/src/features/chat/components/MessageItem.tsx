import type { ChatMessage } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface MessageItemProps {
  msg: ChatMessage;
}

export default function MessageItem({ msg }: MessageItemProps) {
  const timeString = new Date(msg.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex gap-4 items-start group hover:bg-zinc-800/20 p-2 rounded-xl transition duration-150">
      <Avatar className="w-10 h-10 border border-zinc-800">
        <AvatarFallback className="bg-zinc-800 text-zinc-200 font-bold select-none text-sm">
          {msg.username.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-white text-sm hover:underline cursor-pointer select-text">
            {msg.username}
          </span>
          <span className="text-[10px] text-zinc-500 font-medium select-none">
            {timeString}
          </span>
        </div>
        <p className="text-zinc-300 text-sm mt-1 select-text break-words leading-relaxed">
          {msg.content}
        </p>
      </div>
    </div>
  );
}
