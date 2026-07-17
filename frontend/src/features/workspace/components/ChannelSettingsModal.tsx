import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Trash2, ShieldAlert } from 'lucide-react';
import api from '@/lib/api';
import type { Channel } from '@/types';
import { useChatStore } from '@/store/useChatStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/store/useToastStore';
import { useConfirm } from '@/store/useConfirmStore';

interface ChannelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  workspaceId: string;
}

export default function ChannelSettingsModal({
  open,
  onOpenChange,
  channel,
  workspaceId,
}: ChannelSettingsModalProps) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { activeChannelId, setActiveChannelId } = useChatStore();
  const confirm = useConfirm();

  useEffect(() => {
    if (channel) {
      setName(channel.name);
    }
  }, [channel]);

  const updateChanMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await api.put(`/workspaces/${workspaceId}/channels/${channel.id}`, {
        name: newName,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
      toast.success('Đã đổi tên kênh thành công!');
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Đổi tên kênh thất bại.');
    },
  });

  const deleteChanMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/workspaces/${workspaceId}/channels/${channel.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels', workspaceId] });
      toast.success('Đã xóa kênh thành công!');
      if (activeChannelId === channel.id) {
        setActiveChannelId(null);
      }
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Xóa kênh thất bại.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateChanMutation.mutate(name.trim().toLowerCase());
  };

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Xóa Kênh "${channel.name}"?`,
      description: 'Hành động này sẽ xóa vĩnh viễn toàn bộ tin nhắn và lịch sử của kênh này. Bạn có chắc chắn muốn tiếp tục?',
      confirmText: 'Xóa kênh',
      cancelText: 'Hủy',
      variant: 'destructive',
    });

    if (isConfirmed) {
      deleteChanMutation.mutate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            Cài đặt Kênh: {channel.type === 'voice' ? '🔊' : '#'} {channel.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            Thay đổi tùy chọn hoặc xóa kênh hiện tại.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="chan-settings-name" className="text-zinc-300">Tên Kênh</Label>
            <Input
              id="chan-settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ví dụ: general, gaming"
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
              disabled={updateChanMutation.isPending || deleteChanMutation.isPending}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
              disabled={updateChanMutation.isPending || deleteChanMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={!name.trim() || name.trim().toLowerCase() === channel.name || updateChanMutation.isPending || deleteChanMutation.isPending}
            >
              {updateChanMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>

        <div className="border-t border-zinc-800/60 my-2" />

        {/* Danger Zone */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
            Vùng nguy hiểm
          </h4>
          <div className="border border-rose-950/20 bg-rose-950/5 rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h5 className="text-xs font-bold text-rose-450">Xóa Kênh</h5>
              <p className="text-[10px] text-zinc-500 mt-0.5">Xóa vĩnh viễn toàn bộ tin nhắn của kênh. Hành động không thể hoàn tác.</p>
            </div>
            <Button
              type="button"
              onClick={handleDelete}
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-500 text-white text-xs px-3 h-8 shrink-0 rounded-lg gap-1"
              disabled={updateChanMutation.isPending || deleteChanMutation.isPending}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa kênh
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
