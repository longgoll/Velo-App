import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';
import api from '@/lib/api';
import type { UserData } from '@/types';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: UserData) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsLoading(true);

    try {
      if (isRegister) {
        if (!username || !email || password.length < 6) {
          throw new Error('Username and email are required, password must be at least 6 characters');
        }
        const res = await api.post('/auth/register', { username, email, password });
        onAuthSuccess(res.data.token, res.data.user);
      } else {
        if (!email || !password) {
          throw new Error('Email and password are required');
        }
        const res = await api.post('/auth/login', { email, password });
        onAuthSuccess(res.data.token, res.data.user);
      }
    } catch (err: any) {
      setAuthError(err.response?.data?.error || err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-zinc-950 px-4">
      <div className="w-full max-w-md p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            {isRegister ? 'Tạo tài khoản mới' : 'Chào mừng trở lại'}
          </h2>
          <p className="text-sm text-zinc-400 mt-1 text-center">
            {isRegister ? 'Bắt đầu trải nghiệm chat thế hệ mới' : 'Đăng nhập vào không gian làm việc của bạn'}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {isRegister && (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-zinc-300">Tên người dùng</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
                placeholder="long_hoang"
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
              placeholder="you@domain.com"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-300">Mật khẩu</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-zinc-950 border-zinc-800 text-white focus-visible:ring-indigo-500"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {authError && (
            <p className="text-sm text-red-400 font-medium bg-red-950/30 border border-red-900/50 p-3 rounded-lg">
              {authError}
            </p>
          )}

          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold h-11 rounded-lg"
            disabled={isLoading}
          >
            {isLoading ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-400">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <button
            onClick={() => {
              setIsRegister(!isRegister);
              setAuthError('');
            }}
            className="text-indigo-400 hover:underline font-semibold"
            disabled={isLoading}
          >
            {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}
