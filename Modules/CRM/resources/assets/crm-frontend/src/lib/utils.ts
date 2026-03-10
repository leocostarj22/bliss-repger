import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function playSound(src: string, options?: { volume?: number }) {
  try {
    const audio = new Audio(src);
    if (typeof options?.volume === 'number') {
      audio.volume = Math.min(1, Math.max(0, options.volume));
    }
    audio.play().catch(() => {});
  } catch {
    // ignore
  }
}
