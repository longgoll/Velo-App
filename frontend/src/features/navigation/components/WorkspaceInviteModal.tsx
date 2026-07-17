import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Share2,
  Info
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/store/useToastStore';

interface WorkspaceInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceName: string;
  inviteCode?: string;
  workspaceId: string;
}

export default function WorkspaceInviteModal({
  open,
  onOpenChange,
  workspaceName,
  inviteCode,
  workspaceId,
}: WorkspaceInviteModalProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyCode = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    toast.success('Đã sao chép mã mời!');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!inviteCode) return;
    const inviteLink = `${window.location.origin}?invite=${inviteCode}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    toast.success('Đã sao chép liên kết mời!');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(workspaceId);
    setCopiedId(true);
    toast.success('Đã sao chép ID không gian!');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const inviteLink = inviteCode ? `${window.location.origin}?invite=${inviteCode}` : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[90vw] bg-zinc-950 border border-zinc-800 text-zinc-200 p-6 rounded-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Share2 className="w-5 h-5" />
            <DialogTitle className="text-lg font-bold text-white">Mời thành viên</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-zinc-400">
            Mời bạn bè tham gia không gian làm việc <span className="font-semibold text-zinc-200">"{workspaceName}"</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Invite Link Section */}
          {inviteCode ? (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400">Gửi liên kết mời trực tiếp</label>
              <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 pl-3 gap-2">
                <span className="text-xs text-zinc-300 truncate flex-1 font-medium">{inviteLink}</span>
                <Button 
                  size="sm" 
                  onClick={handleCopyLink}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 shrink-0 px-3"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                  {copiedLink ? 'Đã sao chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 bg-rose-950/20 border border-rose-500/10 rounded-xl p-3 text-xs text-rose-400">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Không gian này hiện chưa có mã mời. Bạn cần là Quản trị viên để tạo mã mời.</p>
            </div>
          )}

          {inviteCode && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Invite Code Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-2 items-start text-left">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Mã mời</span>
                <span className="text-sm font-bold font-mono text-zinc-200">{inviteCode}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyCode}
                  className="w-full justify-center text-xs h-7 border-zinc-800 hover:bg-zinc-800"
                >
                  {copiedCode ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedCode ? 'Đã sao chép' : 'Sao chép'}
                </Button>
              </div>

              {/* Workspace ID Card */}
              <div className="bg-zinc-900/50 border border-zinc-800/60 rounded-xl p-3 flex flex-col gap-2 items-start text-left">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID Không gian</span>
                <span className="text-[11px] font-medium text-zinc-400 truncate w-full font-mono">{workspaceId.slice(0, 8)}...</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCopyId}
                  className="w-full justify-center text-xs h-7 border-zinc-800 hover:bg-zinc-800"
                >
                  {copiedId ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                  {copiedId ? 'Đã sao chép' : 'Sao chép'}
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-zinc-850">
          <Button size="sm" onClick={() => onOpenChange(false)} className="bg-zinc-800 hover:bg-zinc-700 text-xs">
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
