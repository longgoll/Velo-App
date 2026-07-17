import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Trash2, ShieldAlert, UserMinus } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface ChannelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
  workspaceId: string;
}

type TabType = 'general' | 'members';

export default function ChannelSettingsModal({
  open,
  onOpenChange,
  channel,
  workspaceId,
}: ChannelSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [name, setName] = useState('');
  const [selectedUserToAdd, setSelectedUserToAdd] = useState('');
  
  const queryClient = useQueryClient();
  const { activeChannelId, setActiveChannelId } = useChatStore();
  const confirm = useConfirm();

  // Reset to default tab when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab('general');
    }
  }, [open]);

  useEffect(() => {
    if (channel) {
      setName(channel.name);
    }
  }, [channel]);

  // Fetch workspace members
  const { data: wsMembers = [] } = useQuery<any[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data;
    },
    enabled: !!workspaceId && open && !!channel.is_private,
  });

  // Fetch channel members
  const { data: chanMembers = [], refetch: refetchChanMembers } = useQuery<any[]>({
    queryKey: ['channel-members', channel.id],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/channels/${channel.id}/members`);
      return res.data;
    },
    enabled: !!workspaceId && !!channel.id && open && !!channel.is_private,
  });

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

  const addMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/workspaces/${workspaceId}/channels/${channel.id}/members`, {
        user_id: userId,
      });
    },
    onSuccess: () => {
      refetchChanMembers();
      toast.success('Đã thêm thành viên vào kênh!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Thêm thành viên thất bại.');
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/workspaces/${workspaceId}/channels/${channel.id}/members/${userId}`);
    },
    onSuccess: () => {
      refetchChanMembers();
      toast.success('Đã loại thành viên khỏi kênh!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Loại thành viên thất bại.');
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

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAdd) return;
    addMemberMutation.mutate(selectedUserToAdd);
    setSelectedUserToAdd('');
  };

  // Filter workspace members who are not in the channel
  const nonChannelMembers = wsMembers.filter(
    (wm) => !chanMembers.some((cm) => cm.user_id === wm.user_id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-405" />
            Cài đặt Kênh: {channel.is_private ? '🔒' : (channel.type === 'voice' ? '🔊' : '#')} {channel.name}
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-xs">
            {channel.is_private 
              ? 'Đây là kênh riêng tư. Chỉ thành viên được mời mới có quyền xem nội dung.' 
              : 'Đây là kênh công khai trong không gian làm việc.'}
          </DialogDescription>
        </DialogHeader>

        {/* Tab Header if channel is private */}
        {channel.is_private && (
          <div className="flex border-b border-zinc-800/80 mb-4 text-xs font-semibold select-none">
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`pb-2 px-3 border-b-2 transition-colors outline-none cursor-pointer ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Cấu hình chung
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('members')}
              className={`pb-2 px-3 border-b-2 transition-colors outline-none cursor-pointer ${
                activeTab === 'members'
                  ? 'border-indigo-500 text-indigo-400 font-bold'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Thành viên ({chanMembers.length})
            </button>
          </div>
        )}

        {/* TAB 1: General Settings */}
        {(activeTab === 'general' || !channel.is_private) && (
          <>
            <form onSubmit={handleSubmit} className="space-y-4 py-1">
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
          </>
        )}

        {/* TAB 2: Private Channel Members Management */}
        {activeTab === 'members' && channel.is_private && (
          <div className="space-y-4 py-1">
            {/* Invite select form */}
            <div>
              <Label className="text-zinc-300 text-xs font-bold block mb-1.5">Mời thành viên mới</Label>
              {nonChannelMembers.length > 0 ? (
                <form onSubmit={handleAddMemberSubmit} className="flex gap-2">
                  <select
                    value={selectedUserToAdd}
                    onChange={(e) => setSelectedUserToAdd(e.target.value)}
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white outline-none cursor-pointer"
                    disabled={addMemberMutation.isPending}
                  >
                    <option value="">-- Chọn thành viên Workspace --</option>
                    {nonChannelMembers.map((wm) => (
                      <option key={wm.user_id} value={wm.user_id}>
                        {wm.user?.username || 'Thành viên'} ({wm.user?.email})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="submit"
                    disabled={!selectedUserToAdd || addMemberMutation.isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-[34px] px-3 rounded-lg shrink-0"
                  >
                    {addMemberMutation.isPending ? 'Đang thêm...' : 'Mời vào'}
                  </Button>
                </form>
              ) : (
                <p className="text-[10px] text-zinc-500 italic">Mọi thành viên Workspace đã tham gia kênh riêng tư này.</p>
              )}
            </div>

            {/* Members List */}
            <div className="space-y-2 pt-1">
              <Label className="text-zinc-350 text-xs font-bold block">Danh sách thành viên kênh ({chanMembers.length})</Label>
              <div className="max-h-[220px] overflow-y-auto space-y-1.5 pr-1.5 custom-scrollbar">
                {chanMembers.map((cm) => {
                  const username = cm.user?.username || 'Người dùng';
                  const initials = username.slice(0, 2).toUpperCase();
                  return (
                    <div key={cm.user_id} className="flex items-center justify-between p-2 bg-zinc-950/40 border border-zinc-850/60 rounded-xl hover:bg-zinc-950/80 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar size="sm" className="w-7 h-7">
                          <AvatarFallback className="text-[9px] font-bold bg-zinc-800 text-indigo-400">
                            {initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="truncate text-left leading-tight">
                          <div className="text-xs font-semibold text-zinc-200 truncate">{username}</div>
                          <div className="text-[9px] text-zinc-500 truncate mt-0.5">{cm.user?.email}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeMemberMutation.mutate(cm.user_id)}
                        disabled={removeMemberMutation.isPending}
                        className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors cursor-pointer outline-none border-0 bg-transparent shrink-0"
                        title="Loại khỏi kênh"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {chanMembers.length === 0 && (
                  <p className="text-[10px] text-zinc-550 italic text-center py-4">Kênh này chưa có thành viên nào.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
