import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useChatStore } from '@/store/useChatStore';
import api from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateChannelModal({ open, onOpenChange }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice'>('text');
  const [isPrivate, setIsPrivate] = useState(false);
  const queryClient = useQueryClient();
  const { activeWorkspaceId, setActiveChannelId } = useChatStore();

  const createChanMutation = useMutation({
    mutationFn: async (chanData: { name: string; type: 'text' | 'voice'; is_private: boolean }) => {
      const res = await api.post(`/workspaces/${activeWorkspaceId}/channels`, chanData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels', activeWorkspaceId] });
      setActiveChannelId(data.id);
      setName('');
      setType('text');
      setIsPrivate(false);
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    createChanMutation.mutate({ name: name.trim().toLowerCase(), type, is_private: isPrivate });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tạo Kênh chat mới</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Tạo kênh giao tiếp dạng chữ viết hoặc trò chuyện trực tiếp bằng giọng nói.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="chan-name" className="text-zinc-300">Tên Kênh</Label>
            <Input
              id="chan-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ví dụ: general, gaming"
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
              disabled={createChanMutation.isPending}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-zinc-300 block mb-1">Loại Kênh</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="chanType"
                  checked={type === 'text'}
                  onChange={() => setType('text')}
                  className="accent-indigo-500 h-4 w-4"
                  disabled={createChanMutation.isPending}
                />
                Kênh Chữ (Text)
              </label>
              <label className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="chanType"
                  checked={type === 'voice'}
                  onChange={() => setType('voice')}
                  className="accent-indigo-500 h-4 w-4"
                  disabled={createChanMutation.isPending}
                />
                Kênh Thoại (Voice)
              </label>
            </div>
          </div>

          {/* Private Channel Option */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-950/60 border border-zinc-850/80 rounded-xl">
            <div className="space-y-0.5 pr-2">
              <Label htmlFor="chan-private" className="text-zinc-200 text-xs font-bold cursor-pointer flex items-center gap-1.5">
                Kênh Riêng Tư (Private)
              </Label>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Chỉ những thành viên được mời mới có thể xem và tham gia kênh này.
              </p>
            </div>
            <input
              id="chan-private"
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="accent-indigo-600 h-4 w-4 cursor-pointer rounded bg-zinc-950 border-zinc-800"
              disabled={createChanMutation.isPending}
            />
          </div>

          <DialogFooter className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
              disabled={createChanMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={!name.trim() || createChanMutation.isPending}
            >
              {createChanMutation.isPending ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
