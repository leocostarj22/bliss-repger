import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getInitials(name?: string | null) {
  const n = String(name ?? "").trim();
  if (!n) return "?";
  const parts = n.split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "?";
  const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
  return (a + b).toUpperCase();
}

export function resolvePhotoUrl(photoPath?: string | null) {
  const raw = String(photoPath ?? "").trim();
  if (!raw) return null;

  if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  const normalized = raw.startsWith("/") ? raw : `/storage/${raw.replace(/^storage\//, "")}`;

  const encodePath = (path: string) =>
    path
      .split("/")
      .map((seg) => (seg ? encodeURIComponent(seg) : seg))
      .join("/");

  const encoded = (() => {
    const [path, query] = normalized.split("?");
    const next = encodePath(path);
    return query ? `${next}?${query}` : next;
  })();

  if (typeof window === "undefined") return encoded;

  const backendOrigin = window.location.port === "5174" ? "http://127.0.0.1:8000" : window.location.origin;
  return `${backendOrigin}${encoded}`;
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

const normalizePermission = (p: string) => String(p ?? "").trim().toLowerCase()

export function permissionMatches(granted: string, required: string) {
  const g = normalizePermission(granted)
  const r = normalizePermission(required)

  if (!g || !r) return false
  if (g === "*") return true
  if (g === r) return true

  if (g.endsWith(".*")) {
    const prefix = g.slice(0, -1)
    return r.startsWith(prefix)
  }

  return false
}

export function hasPermission(grantedList: string[] | undefined | null, required: string | string[]) {
  const granted = Array.isArray(grantedList) ? grantedList : []
  const requiredList = Array.isArray(required) ? required : [required]

  if (requiredList.length === 0) return true

  return requiredList.some((req) => granted.some((g) => permissionMatches(g, req)))
}

export function hasEffectivePermission(
  grantedList: string[] | undefined | null,
  deniedList: string[] | undefined | null,
  required: string | string[],
) {
  const granted = Array.isArray(grantedList) ? grantedList : []
  const denied = Array.isArray(deniedList) ? deniedList : []
  const requiredList = Array.isArray(required) ? required : [required]

  if (requiredList.length === 0) return true

  const isDenied = (req: string) => denied.some((d) => permissionMatches(d, req))
  const isGranted = (req: string) => granted.some((g) => permissionMatches(g, req))

  return requiredList.some((req) => !isDenied(req) && isGranted(req))
}
