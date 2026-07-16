import { useToastStore } from '@/store/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toaster() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => {
        let Icon = Info;
        let iconColor = 'text-blue-400';
        let borderColor = 'border-zinc-800';

        if (toast.type === 'success') {
          Icon = CheckCircle2;
          iconColor = 'text-emerald-500';
          borderColor = 'border-emerald-500/20';
        } else if (toast.type === 'error') {
          Icon = AlertCircle;
          iconColor = 'text-rose-500';
          borderColor = 'border-rose-500/20';
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full bg-zinc-950/95 backdrop-blur-md border ${borderColor} text-zinc-100 rounded-xl shadow-lg shadow-black/40 px-4 py-3 flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-right-4 fade-in`}
            role="alert"
          >
            <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
            
            <div className="flex-1 text-sm font-medium leading-5 select-text">
              {toast.message}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors shrink-0 p-0.5 rounded-md hover:bg-zinc-900"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
