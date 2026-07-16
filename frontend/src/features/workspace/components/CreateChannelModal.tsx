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
  const queryClient = useQueryClient();
  const { activeWorkspaceId, setActiveChannelId } = useChatStore();

  const createChanMutation = useMutation({
    mutationFn: async (chanData: { name: string; type: 'text' | 'voice' }) => {
      const res = await api.post(`/workspaces/${activeWorkspaceId}/channels`, chanData);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['channels', activeWorkspaceId] });
      setActiveChannelId(data.id);
      setName('');
      setType('text');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !activeWorkspaceId) return;
    createChanMutation.mutate({ name: name.trim().toLowerCase(), type });
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
