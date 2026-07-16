import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAvatarGradient(username: string): string {
  if (!username) return "bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-300";
  
  const gradients = [
    "bg-gradient-to-br from-indigo-500 to-purple-600 text-white",
    "bg-gradient-to-br from-emerald-400 to-teal-600 text-white",
    "bg-gradient-to-br from-rose-500 to-red-600 text-white",
    "bg-gradient-to-br from-amber-400 to-orange-600 text-white",
    "bg-gradient-to-br from-cyan-500 to-blue-600 text-white",
    "bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white",
    "bg-gradient-to-br from-violet-500 to-indigo-700 text-white",
    "bg-gradient-to-br from-lime-500 to-emerald-600 text-white",
    "bg-gradient-to-br from-sky-400 to-blue-600 text-white",
  ];

  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  return gradients[index];
}
