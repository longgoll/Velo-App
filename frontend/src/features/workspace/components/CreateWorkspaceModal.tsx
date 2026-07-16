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

interface CreateWorkspaceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateWorkspaceModal({ open, onOpenChange }: CreateWorkspaceModalProps) {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const { setActiveWorkspaceId } = useChatStore();

  const createWsMutation = useMutation({
    mutationFn: async (wsName: string) => {
      const res = await api.post('/workspaces', { name: wsName });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspaceId(data.id);
      setName('');
      onOpenChange(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    createWsMutation.mutate(name);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Tạo Không gian Làm việc mới</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Đặt tên cho không gian làm việc của bạn (ví dụ: Work, Gaming, Study...).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="ws-name" className="text-zinc-300">Tên Không gian</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tên Không gian"
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
              disabled={createWsMutation.isPending}
            />
          </div>
          <DialogFooter className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white"
              disabled={createWsMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={!name.trim() || createWsMutation.isPending}
            >
              {createWsMutation.isPending ? 'Đang tạo...' : 'Tạo mới'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
