import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/store/useToastStore';
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

interface JoinWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function JoinWorkspaceModal({ open, onOpenChange }: JoinWorkspaceModalProps) {
  const [inviteId, setInviteId] = useState('');
  const queryClient = useQueryClient();

  const joinWsMutation = useMutation({
    mutationFn: async (idOrCode: string) => {
      const cleaned = idOrCode.trim();
      // If code looks like an invite code (8 chars and alphanumeric without hyphen)
      if (cleaned.length === 8 && !cleaned.includes('-')) {
        const res = await api.post('/workspaces/join', { invite_code: cleaned });
        return res.data;
      }
      // Fallback to direct ID join
      const res = await api.post(`/workspaces/${cleaned}/join`);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setInviteId('');
      onOpenChange(false);
      if (data && data.name) {
        toast.success(`Đã tham gia Không gian làm việc "${data.name}" thành công!`);
      } else {
        toast.success('Đã tham gia Không gian làm việc thành công!');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể tham gia Không gian làm việc');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteId.trim()) return;
    joinWsMutation.mutate(inviteId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Gia nhập Không gian mới</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Nhập Mã mời (Invite Code) hoặc ID Không gian bạn được chia sẻ để tham gia vào phòng trò chuyện.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ws-id" className="text-zinc-300">Mã mời hoặc ID Không gian</Label>
            <Input
              id="ws-id"
              value={inviteId}
              onChange={(e) => setInviteId(e.target.value)}
              placeholder="Nhập Mã mời (ví dụ: ABC123XY) hoặc ID"
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500 font-mono text-sm"
              disabled={joinWsMutation.isPending}
            />
          </div>
          <DialogFooter className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
              disabled={joinWsMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={!inviteId.trim() || joinWsMutation.isPending}
            >
              {joinWsMutation.isPending ? 'Đang tham gia...' : 'Tham gia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
