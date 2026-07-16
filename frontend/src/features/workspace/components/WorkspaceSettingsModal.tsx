import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Settings, 
  Users, 
  Trash2, 
  LogOut, 
  Copy, 
  RefreshCw, 
  Check, 
  UserMinus, 
  ShieldAlert, 
  Shield, 
  ShieldCheck, 
  Search,
  ArrowRightLeft
} from 'lucide-react';
import api from '@/lib/api';
import type { Workspace, WorkspaceMember, UserData } from '@/types';
import { useChatStore } from '@/store/useChatStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getAvatarGradient } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/store/useToastStore';
import { useConfirm } from '@/store/useConfirmStore';

interface WorkspaceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

type TabType = 'general' | 'members';

export default function WorkspaceSettingsModal({
  open,
  onOpenChange,
  workspaceId,
}: WorkspaceSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('general');
  const [wsName, setWsName] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  
  const queryClient = useQueryClient();
  const { setActiveWorkspaceId } = useChatStore();
  const confirm = useConfirm();

  // Current logged in user info
  const currentUserStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const currentUser: UserData | null = currentUserStr ? JSON.parse(currentUserStr) : null;

  // 1. Fetch workspaces from cache to find the active workspace details
  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    enabled: !!workspaceId,
  });

  const workspace = workspaces.find((w) => w.id === workspaceId);

  // Initialize workspace name state when workspace details are loaded
  React.useEffect(() => {
    if (workspace) {
      setWsName(workspace.name);
    }
  }, [workspace]);

  // 2. Fetch members list of the workspace
  const { data: members = [] } = useQuery<WorkspaceMember[]>({
    queryKey: ['workspace-members', workspaceId],
    queryFn: async () => {
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      return res.data;
    },
    enabled: !!workspaceId && open,
  });

  // Identify current user's role in this workspace
  const myMemberRecord = members.find((m) => m.user_id === currentUser?.id);
  const myRole = myMemberRecord?.role || 'member'; // owner, admin, member

  React.useEffect(() => {
    if (myRole === 'member') {
      setActiveTab('members');
    } else {
      setActiveTab('general');
    }
  }, [myRole]);

  // 3. Mutations
  // 3.1. Update workspace details (name)
  const updateWsMutation = useMutation({
    mutationFn: async (newName: string) => {
      const res = await api.put(`/workspaces/${workspaceId}`, { name: newName });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Đã cập nhật tên Không gian làm việc!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể cập nhật Không gian làm việc');
    },
  });

  // 3.2. Delete workspace
  const deleteWsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/workspaces/${workspaceId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspaceId(null);
      onOpenChange(false);
      toast.success('Đã xóa Không gian làm việc!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể xóa Không gian làm việc');
    },
  });

  // 3.3. Leave workspace
  const leaveWsMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/workspaces/${workspaceId}/leave`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setActiveWorkspaceId(null);
      onOpenChange(false);
      toast.success('Đã rời khỏi Không gian làm việc!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể rời Không gian làm việc');
    },
  });

  // 3.4. Update member role (Owner only)
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await api.put(`/workspaces/${workspaceId}/members/${memberId}`, { role });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      if (variables.role === 'owner') {
        // Ownership transferred. We should reload workspaces list to update local views
        queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      }
      toast.success('Đã cập nhật vai trò thành viên!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể cập nhật vai trò');
    },
  });

  // 3.5. Kick member
  const kickMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const res = await api.delete(`/workspaces/${workspaceId}/members/${memberId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members', workspaceId] });
      toast.success('Đã trục xuất thành viên khỏi Không gian!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể trục xuất thành viên');
    },
  });

  // 3.6. Regenerate invite code
  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post(`/workspaces/${workspaceId}/invite-code/regenerate`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Đã tạo mã mời mới!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Không thể tạo mã mời mới');
    },
  });

  const handleUpdateName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wsName.trim() || wsName === workspace?.name) return;
    updateWsMutation.mutate(wsName);
  };

  const handleCopyLink = () => {
    if (!workspace?.invite_code) return;
    const inviteLink = `${window.location.origin}?invite=${workspace.invite_code}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!workspace?.invite_code) return;
    navigator.clipboard.writeText(workspace.invite_code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRegenerateCode = async () => {
    const ok = await confirm({
      title: 'Tạo mã mời mới',
      description: 'Bạn có chắc chắn muốn tạo mã mời mới? Mã mời cũ sẽ KHÔNG CÒN HIỆU LỰC.',
    });
    if (ok) {
      regenerateCodeMutation.mutate();
    }
  };

  const handleDeleteWorkspace = async () => {
    const ok = await confirm({
      title: 'Xóa Không gian làm việc',
      description: 'CẢNH BÁO CỰC KỲ QUAN TRỌNG: Bạn có chắc chắn muốn XÓA không gian này? Hành động này sẽ xóa vĩnh viễn toàn bộ các kênh chat, tin nhắn và không thể khôi phục!',
      variant: 'destructive',
      confirmText: 'Xóa vĩnh viễn',
    });
    if (ok) {
      deleteWsMutation.mutate();
    }
  };

  const handleLeaveWorkspace = async () => {
    const ok = await confirm({
      title: 'Rời Không gian làm việc',
      description: 'Bạn có chắc chắn muốn RỜI KHỎI không gian làm việc này? Bạn sẽ cần mã mời mới nếu muốn tham gia lại.',
      variant: 'destructive',
      confirmText: 'Rời đi',
    });
    if (ok) {
      leaveWsMutation.mutate();
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    let confirmMsg = `Bạn có chắc chắn muốn đổi vai trò thành viên này thành ${role === 'admin' ? 'Quản trị viên' : 'Thành viên'}?`;
    let title = 'Thay đổi vai trò';
    let variant: 'default' | 'destructive' = 'default';
    if (role === 'owner') {
      title = 'Chuyển nhượng Quyền sở hữu';
      confirmMsg = 'CẢNH BÁO: Chuyển nhượng quyền Chủ sở hữu (Owner) sẽ hạ cấp tài khoản của bạn xuống Admin. Bạn có chắc chắn muốn chuyển giao không?';
      variant = 'destructive';
    }
    const ok = await confirm({
      title,
      description: confirmMsg,
      variant,
      confirmText: role === 'owner' ? 'Chuyển nhượng' : 'Thay đổi',
    });
    if (ok) {
      updateRoleMutation.mutate({ memberId, role });
    }
  };

  const handleKickMember = async (memberId: string, memberName: string) => {
    const ok = await confirm({
      title: 'Trục xuất thành viên',
      description: `Bạn có chắc chắn muốn trục xuất "${memberName}" ra khỏi không gian làm việc?`,
      variant: 'destructive',
      confirmText: 'Trục xuất',
    });
    if (ok) {
      kickMemberMutation.mutate(memberId);
    }
  };

  // Filter members list based on search term
  const filteredMembers = members.filter((m) => 
    m.user?.username.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.user?.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white sm:max-w-2xl p-0 overflow-hidden flex flex-col h-[580px] max-h-[85vh] rounded-2xl shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-3 border-b border-zinc-800/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Cài đặt Không gian</DialogTitle>
              <p className="text-xs text-zinc-400 mt-0.5">Quản lý thiết lập chung, mã mời và phân quyền thành viên cho "{workspace?.name}"</p>
            </div>
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800/40 bg-zinc-950/20 px-6 shrink-0">
          {myRole !== 'member' && (
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition ${
                activeTab === 'general'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              Thiết lập chung
            </button>
          )}
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-3 text-xs font-semibold border-b-2 flex items-center gap-2 cursor-pointer transition ${
              activeTab === 'members' || myRole === 'member'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            Quản lý thành viên ({members.length})
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0 bg-zinc-900/40">
          {/* TAB 1: GENERAL SETTINGS */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Part 1: Rename Workspace */}
              <form onSubmit={handleUpdateName} className="space-y-2.5">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Tên Không gian</label>
                <div className="flex gap-3">
                  <Input
                    value={wsName}
                    onChange={(e) => setWsName(e.target.value)}
                    disabled={myRole !== 'owner' && myRole !== 'admin'}
                    className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500 rounded-xl"
                    placeholder="Nhập tên không gian làm việc"
                  />
                  {(myRole === 'owner' || myRole === 'admin') && (
                    <Button
                      type="submit"
                      disabled={!wsName.trim() || wsName === workspace?.name || updateWsMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white shrink-0 px-4 rounded-xl font-medium text-xs"
                    >
                      {updateWsMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  )}
                </div>
                {myRole !== 'owner' && myRole !== 'admin' && (
                  <p className="text-[11px] text-zinc-500 italic">Chỉ có Chủ sở hữu và Quản trị viên mới được phép đổi tên.</p>
                )}
              </form>

              <div className="border-t border-zinc-800/40 my-4" />

              {/* Part 2: Invite Code & Invite Link */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Mã mời và liên kết tham gia</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Invite Code Box */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-zinc-500">Mã mời 8 ký tự</span>
                      <div className="text-xl font-mono font-extrabold tracking-wider text-indigo-400 mt-1.5 select-all">
                        {workspace?.invite_code || '---'}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button
                        type="button"
                        onClick={handleCopyCode}
                        variant="secondary"
                        className="bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-800 w-full rounded-lg text-xs py-1 h-8 gap-1.5"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? 'Đã copy' : 'Copy mã'}
                      </Button>
                      {(myRole === 'owner' || myRole === 'admin') && (
                        <Button
                          type="button"
                          onClick={handleRegenerateCode}
                          variant="ghost"
                          disabled={regenerateCodeMutation.isPending}
                          className="hover:bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 w-10 h-8 p-0 rounded-lg shrink-0 border border-zinc-800/40"
                          title="Tạo mã mời mới"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${regenerateCodeMutation.isPending ? 'animate-spin text-indigo-400' : ''}`} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Invite Link Box */}
                  <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] font-semibold text-zinc-500">Link mời trực tiếp</span>
                      <p className="text-[11px] text-zinc-400 mt-1 select-all truncate bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-850 font-mono">
                        {workspace?.invite_code ? `${window.location.origin}?invite=${workspace.invite_code}` : '---'}
                      </p>
                    </div>
                    <Button
                      type="button"
                      onClick={handleCopyLink}
                      variant="secondary"
                      className="bg-zinc-850 hover:bg-zinc-800 text-zinc-200 border-zinc-800 w-full rounded-lg text-xs py-1 h-8 mt-4 gap-1.5"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? 'Đã copy link' : 'Copy link mời'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="border-t border-zinc-800/40 my-4" />

              {/* Part 3: Danger Zone */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500 animate-pulse" />
                  Vùng nguy hiểm (Danger Zone)
                </h3>
                <div className="border border-rose-950/20 bg-rose-950/5 rounded-xl p-4 flex items-center justify-between gap-4">
                  {myRole === 'owner' ? (
                    <>
                      <div>
                        <h4 className="text-sm font-bold text-rose-400">Xóa Không gian làm việc</h4>
                        <p className="text-xs text-zinc-500 mt-1">Xóa vĩnh viễn toàn bộ các kênh chat, tin nhắn và lịch sử. Hành động này không thể khôi phục.</p>
                      </div>
                      <Button
                        onClick={handleDeleteWorkspace}
                        disabled={deleteWsMutation.isPending}
                        className="bg-rose-600 hover:bg-rose-500 text-white shrink-0 rounded-xl text-xs gap-1.5 font-semibold h-9 px-4"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa không gian
                      </Button>
                    </>
                  ) : (
                    <>
                      <div>
                        <h4 className="text-sm font-bold text-rose-400">Rời khỏi Không gian làm việc</h4>
                        <p className="text-xs text-zinc-500 mt-1">Bạn sẽ không còn nhìn thấy hay truy cập được vào các tin nhắn của không gian này.</p>
                      </div>
                      <Button
                        onClick={handleLeaveWorkspace}
                        disabled={leaveWsMutation.isPending}
                        className="bg-rose-900/20 hover:bg-rose-600 border border-rose-500/20 text-rose-400 hover:text-white shrink-0 rounded-xl text-xs gap-1.5 font-semibold h-9 px-4 transition-colors duration-200"
                      >
                        <LogOut className="w-4 h-4" />
                        Rời không gian
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS MANAGEMENT */}
          {activeTab === 'members' && (
            <div className="flex flex-col h-full space-y-4">
              {/* Search Bar */}
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Tìm thành viên bằng tên đăng ký hoặc email..."
                  className="pl-9 bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 rounded-xl text-xs py-1 h-9"
                />
              </div>

              {/* Members List Scroll Container */}
              <div className="flex-1 space-y-2 pr-1 overflow-y-auto min-h-[300px]">
                {filteredMembers.map((m) => {
                  if (!m.user) return null;
                  const isSelf = m.user_id === currentUser?.id;
                  
                  return (
                    <div 
                      key={m.user_id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950/20 border border-zinc-800/30 hover:border-zinc-800/60 hover:bg-zinc-950/40 transition duration-200"
                    >
                      {/* Left: Avatar + Username + Role details */}
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar size="sm">
                          <AvatarFallback className={`font-bold text-xs select-none ${getAvatarGradient(m.user.username)}`}>
                            {m.user.username.slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-zinc-100 truncate">{m.user.username}</span>
                            {isSelf && (
                              <span className="text-[9px] font-medium bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md shrink-0">
                                Bạn
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 block truncate">{m.user.email}</span>
                        </div>
                      </div>

                      {/* Right: Role Badge & Action Trigger */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Role Badge representation */}
                        {m.role === 'owner' && (
                          <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                            <Shield className="w-3.5 h-3.5 text-indigo-400" />
                            Chủ sở hữu
                          </span>
                        )}
                        {m.role === 'admin' && (
                          <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 select-none">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                            Quản trị viên
                          </span>
                        )}
                        {m.role === 'member' && (
                          <span className="text-[9px] font-bold text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full select-none">
                            Thành viên
                          </span>
                        )}

                        {/* Actions Trigger Dropdown */}
                        {!isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button 
                                  variant="ghost" 
                                  className="w-8 h-8 p-0 rounded-lg hover:bg-zinc-800 hover:text-white"
                                  disabled={
                                    // Member cannot do anything
                                    myRole === 'member' || 
                                    // Target is owner, nobody can modify owner except themselves (transfer ownership)
                                    m.role === 'owner' || 
                                    // Admin trying to touch another Admin
                                    (myRole === 'admin' && m.role === 'admin')
                                  }
                                >
                                  •••
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="bg-zinc-950 border-zinc-800 min-w-44">
                              {/* 1. Modify Role (Owner only) */}
                              {myRole === 'owner' && (
                                <>
                                  {m.role === 'member' ? (
                                    <DropdownMenuItem 
                                      onClick={() => handleRoleChange(m.user_id, 'admin')}
                                      className="text-xs hover:bg-zinc-900 cursor-pointer font-medium text-zinc-300 gap-2"
                                    >
                                      <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                                      Thăng làm Admin
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem 
                                      onClick={() => handleRoleChange(m.user_id, 'member')}
                                      className="text-xs hover:bg-zinc-900 cursor-pointer font-medium text-zinc-300 gap-2"
                                    >
                                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                                      Hạ xuống Thành viên
                                    </DropdownMenuItem>
                                  )}
                                  
                                  <DropdownMenuItem 
                                    onClick={() => handleRoleChange(m.user_id, 'owner')}
                                    className="text-xs hover:bg-zinc-900 cursor-pointer font-medium text-indigo-400 gap-2"
                                  >
                                    <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                                    Chuyển quyền Owner
                                  </DropdownMenuItem>

                                  <DropdownMenuSeparator className="bg-zinc-850" />
                                </>
                              )}

                              {/* 2. Kick user */}
                              <DropdownMenuItem 
                                onClick={() => handleKickMember(m.user_id, m.user?.username || '')}
                                variant="destructive"
                                className="text-xs cursor-pointer font-medium gap-2"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Trục xuất (Kick)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <p className="text-center text-xs text-zinc-500 py-8 italic">Không tìm thấy thành viên nào phù hợp.</p>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/60 bg-zinc-950/20 shrink-0 flex justify-between items-center">
          {myRole === 'member' ? (
            <Button
              onClick={handleLeaveWorkspace}
              disabled={leaveWsMutation.isPending}
              variant="destructive"
              className="bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl"
            >
              Rời không gian
            </Button>
          ) : <div />}
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs rounded-xl"
          >
            Đóng cài đặt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
