import { useSyncExternalStore } from 'react';

// Singleton parsed user — tránh JSON.parse mỗi render
let cachedUser: any = null;
let cachedRaw: string | null = null;

function getSnapshot() {
  const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = raw ? JSON.parse(raw) : null;
  }
  return cachedUser;
}

function subscribe(callback: () => void) {
  // Re-sync khi localStorage thay đổi (cross-tab hoặc manual)
  const handler = (e: StorageEvent) => {
    if (e.key === 'user') {
      cachedRaw = null; // force re-parse
      callback();
    }
  };
  window.addEventListener('storage', handler);

  // Custom event khi login/logout trong cùng tab
  const customHandler = () => {
    cachedRaw = null;
    callback();
  };
  window.addEventListener('velo-user-changed', customHandler);

  return () => {
    window.removeEventListener('storage', handler);
    window.removeEventListener('velo-user-changed', customHandler);
  };
}

/**
 * Hook singleton để lấy current user từ localStorage.
 * Dùng `useSyncExternalStore` để đảm bảo đồng bộ với React 19 concurrent mode.
 * Tránh `JSON.parse` mỗi render — chỉ parse khi raw string thay đổi.
 */
export function useCurrentUser() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
