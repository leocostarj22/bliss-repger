import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ImagePlus, MessageSquare, Search, Send, X, Trash2 } from 'lucide-react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

import type { InternalMessage, User as AppUser } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  addInternalMessageReaction,
  deleteInternalMessageRecipient,
  fetchAdminUser,
  fetchChatThread,
  fetchCommunicationRecipients,
  fetchInternalMessages,
  fetchUser,
  markInternalMessageRead,
  removeInternalMessageReaction,
  sendInternalMessage,
  sendInternalMessageWithAttachment,
  type ChatThreadCursor,
  type CommunicationRecipient,
} from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { cn, getInitials, playSound, resolvePhotoUrl } from '@/lib/utils';

type ChatOpenEventDetail = { userId: string; name?: string; email?: string };

const getAny = (m: any, key: string) => (m && Object.prototype.hasOwnProperty.call(m, key) ? m[key] : undefined);

const msgId = (m: any) => String(m?.id ?? '').trim();
const msgFromId = (m: any) => String(m?.from_user_id ?? m?.fromUserId ?? '').trim();
const msgToId = (m: any) => String(m?.to_user_id ?? m?.toUserId ?? '').trim();
const msgReadAt = (m: any) => String(m?.read_at ?? m?.readAt ?? '').trim();
const msgWhenIso = (m: any) =>
  String(m?.sent_at ?? m?.sentAt ?? m?.createdAt ?? getAny(m, 'created_at') ?? getAny(m, 'createdAt') ?? '').trim();

const fmtTime = (iso?: string | null) => {
  const raw = String(iso ?? '').trim();
  if (!raw) return '';
  try {
    return new Date(raw).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return raw;
  }
};

const plainTextFromHtml = (html: string) => {
  const raw = (html ?? '').toString();
  if (!raw.trim()) return '';
  try {
    const doc = new DOMParser().parseFromString(raw, 'text/html');
    return (doc.body.textContent ?? '').replace(/\u00A0/g, ' ').trim();
  } catch {
    return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }
};

const getCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const parts = document.cookie.split(';').map((c) => c.trim());
  const found = parts.find((c) => c.startsWith(`${name}=`));
  if (!found) return null;
  return found.slice(name.length + 1);
};

const ensureCsrfCookie = async (): Promise<void> => {
  const res = await fetch('/sanctum/csrf-cookie', {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
  if (!res.ok) throw new Error('Falha ao obter CSRF cookie');
};

const getPusherConfig = () => {
  const key = String((import.meta as any)?.env?.VITE_PUSHER_APP_KEY ?? '').trim();
  if (!key) return null;

  const cluster = String((import.meta as any)?.env?.VITE_PUSHER_APP_CLUSTER ?? '').trim() || 'mt1';
  const host = String((import.meta as any)?.env?.VITE_PUSHER_HOST ?? '').trim();
  const scheme = String((import.meta as any)?.env?.VITE_PUSHER_SCHEME ?? '').trim() || 'https';
  const portRaw = String((import.meta as any)?.env?.VITE_PUSHER_PORT ?? '').trim();
  const port = portRaw ? Number(portRaw) : scheme === 'http' ? 80 : 443;
  const forceTLS = scheme === 'https';

  return { key, cluster, host, port, scheme, forceTLS };
};

export function ChatDock() {
  const [ready, setReady] = useState(false);

  const [me, setMe] = useState<Pick<AppUser, 'id' | 'name' | 'email' | 'photo_path'>>({
    id: '',
    name: '',
    email: '',
    photo_path: null,
  });
  const [meIsAdmin, setMeIsAdmin] = useState(false);
  const [chatDisabled, setChatDisabled] = useState(false);

  const [users, setUsers] = useState<CommunicationRecipient[]>([]);
  const [inbox, setInbox] = useState<InternalMessage[]>([]);
  const [sent, setSent] = useState<InternalMessage[]>([]);

  const [open, setOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [activeMeta, setActiveMeta] = useState<{ name?: string; email?: string }>({});

  const [conversationSearch, setConversationSearch] = useState('');

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const [thread, setThread] = useState<InternalMessage[]>([]);
  const [threadCursor, setThreadCursor] = useState<ChatThreadCursor | null>(null);
  const [threadHasMore, setThreadHasMore] = useState(false);
  const [threadLoadingOlder, setThreadLoadingOlder] = useState(false);
  const threadLoadingOlderRef = useRef(false);

  const [realtimeActive, setRealtimeActive] = useState(false);
  const echoRef = useRef<any>(null);
  const inboxTickRef = useRef<null | (() => void | Promise<void>)>(null);
  const sentTickRef = useRef<null | (() => void | Promise<void>)>(null);

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>('');
  const [imgLoadingByMsgId, setImgLoadingByMsgId] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inboxRef = useRef<InternalMessage[]>([]);
  const userDetailsRef = useRef<Record<string, { name?: string; email?: string; photo_path?: string | null; role?: string | null; is_admin?: boolean }>>({});
  const prevInboxIdsRef = useRef<Set<string>>(new Set());
  const audioUnlockedRef = useRef(false);

  const [userDetailsById, setUserDetailsById] = useState<
    Record<string, { name?: string; email?: string; photo_path?: string | null; role?: string | null; is_admin?: boolean }>
  >({});

  useEffect(() => {
    inboxRef.current = inbox;
  }, [inbox]);

  useEffect(() => {
    userDetailsRef.current = userDetailsById;
  }, [userDetailsById]);

  const userById = useMemo(() => {
    const map = new Map<string, CommunicationRecipient>();
    users.forEach((u) => map.set(String(u.id), u));
    return map;
  }, [users]);

  const isMobile = useIsMobile();

  const unreadCount = useMemo(() => inbox.reduce((acc, m: any) => (msgReadAt(m) ? acc : acc + 1), 0), [inbox]);

  const unreadByUserId = useMemo(() => {
    const map: Record<string, number> = {};
    const meId = String(me.id || '').trim();
    if (!meId) return map;

    inbox.forEach((m: any) => {
      const from = msgFromId(m);
      if (!from || from === meId) return;
      if (msgReadAt(m)) return;
      map[from] = (map[from] ?? 0) + 1;
    });

    return map;
  }, [inbox, me.id]);

  const conversations = useMemo(() => {
    const meId = String(me.id || '').trim();
    if (!meId) {
      return [] as Array<{ userId: string; name: string; email: string; lastTs: number; unread: number; preview: string; lastTime: string }>;
    }

    const lastByUser = new Map<string, { ts: number; m: any }>();
    const all = [...inbox, ...sent];

    all.forEach((m: any) => {
      const from = msgFromId(m);
      const to = msgToId(m);
      if (!from || !to) return;

      const other = from === meId ? to : to === meId ? from : '';
      if (!other || other === meId) return;

      const ts = Date.parse(msgWhenIso(m)) || 0;
      const prev = lastByUser.get(other);
      if (!prev || ts >= prev.ts) lastByUser.set(other, { ts, m });
    });

    const rows = Array.from(lastByUser.entries()).map(([userId, info]) => {
      const cached = userDetailsById[userId];
      const rec = userById.get(userId);
      const name = String(cached?.name || rec?.name || userId).trim();
      const email = String(cached?.email || rec?.email || '').trim();
      const unread = unreadByUserId[userId] ?? 0;

      const last = info?.m;
      const attachments = Array.isArray(last?.attachments) ? (last.attachments as any[]) : [];
      const hasImage = attachments.some((a) => String(a?.mime_type ?? '').toLowerCase().startsWith('image/'));
      const body = plainTextFromHtml(String(last?.body ?? '')).trim();

      const previewBase = hasImage ? (body ? `📷 ${body}` : '📷 Imagem') : body || '—';
      const preview = previewBase.length > 90 ? `${previewBase.slice(0, 90)}…` : previewBase;
      const lastTime = fmtTime(msgWhenIso(last));

      return { userId, name, email, lastTs: info.ts, unread, preview, lastTime };
    });

    return rows.sort((a, b) => b.lastTs - a.lastTs);
  }, [inbox, sent, me.id, unreadByUserId, userById, userDetailsById]);

  const visibleConversations = useMemo(() => {
    const q = conversationSearch.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => `${c.name} ${c.email}`.toLowerCase().includes(q));
  }, [conversationSearch, conversations]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nexterp:chat:unread', { detail: { count: unreadCount } }));
  }, [unreadCount]);

  const activeUser = useMemo(() => {
    const id = String(activeUserId || '').trim();
    if (!id) return { name: 'Chat', email: '' };

    const cached = userDetailsById[id];
    if (cached?.name || cached?.email) return { name: cached.name ?? id, email: cached.email ?? '' };

    const fromRecipients = userById.get(id);
    if (fromRecipients) return { name: fromRecipients.name, email: fromRecipients.email };

    return { name: activeMeta.name ?? id, email: activeMeta.email ?? '' };
  }, [activeMeta.email, activeMeta.name, activeUserId, userById, userDetailsById]);

  const ensureUserDetails = async (id: string) => {
    const uid = String(id || '').trim();
    if (!uid || uid === me.id) return;

    const current = userDetailsRef.current[uid];
    if (current && (current.photo_path !== undefined || current.name || current.email || current.role || current.is_admin !== undefined)) return;

    try {
      const resp = await fetchAdminUser(uid);
      const u: any = resp?.data;
      if (!u) return;
      setUserDetailsById((prev) => ({
        ...prev,
        [uid]: {
          name: String(u.name ?? prev[uid]?.name ?? '').trim(),
          email: String(u.email ?? prev[uid]?.email ?? '').trim(),
          photo_path: (u.photo_path ?? prev[uid]?.photo_path ?? null) as any,
          role: (u.role ?? prev[uid]?.role ?? null) as any,
          is_admin: (u.is_admin ?? prev[uid]?.is_admin ?? undefined) as any,
        },
      }));
    } catch {
      return;
    }
  };

  useEffect(() => {
    if (!open) return;
    conversations.slice(0, 10).forEach((c) => {
      ensureUserDetails(c.userId);
    });
  }, [conversations, open]);

  const isNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const remaining = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return remaining < 140;
  };

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const conversation = useMemo(() => {
    return thread;
  }, [thread]);

  const canSend = useMemo(() => {
    const other = String(activeUserId || '').trim();
    if (!other) return false;
    if (chatDisabled) return false;
    return true;
  }, [activeUserId, chatDisabled]);

  useEffect(() => {
    if (!ready) return;

    const onPointerDown = () => {
      if (audioUnlockedRef.current) return;
      audioUnlockedRef.current = true;
      try {
        const audio = new Audio('/sounds/message.mp3');
        audio.volume = 0;
        audio.play().then(() => {
          audio.pause();
          audio.currentTime = 0;
        }).catch(() => {});
      } catch {
        // ignore
      }
    };

    window.addEventListener('pointerdown', onPointerDown, { once: true });
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [ready]);

  useEffect(() => {
    (async () => {
      try {
        const meResp = await fetchUser();
        const nextMe: any = meResp?.data;
        setMe({
          id: String(nextMe?.id ?? '').trim(),
          name: String(nextMe?.name ?? '').trim(),
          email: String(nextMe?.email ?? '').trim(),
          photo_path: (nextMe?.photo_path ?? null) as any,
        });
        const role = String(nextMe?.role ?? '').trim().toLowerCase();
        setMeIsAdmin(Boolean(nextMe?.is_admin) || role === 'admin');
        setChatDisabled(role === 'employee');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!ready || chatDisabled) return;

    fetchCommunicationRecipients()
      .then((res) => {
        const rows = (res?.data ?? []) as any[];
        setUsers(rows as any);
        setUserDetailsById((prev) => {
          const next = { ...prev };
          rows.forEach((u: any) => {
            const id = String(u?.id ?? '').trim();
            if (!id) return;
            next[id] = {
              name: String(u?.name ?? next[id]?.name ?? '').trim(),
              email: String(u?.email ?? next[id]?.email ?? '').trim(),
              photo_path: (next[id]?.photo_path ?? null) as any,
              role: (u?.role ?? next[id]?.role ?? null) as any,
              is_admin: (u?.is_admin ?? next[id]?.is_admin ?? undefined) as any,
            };
          });
          return next;
        });
      })
      .catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!me.id || chatDisabled) return;

    const tick = async () => {
      try {
        const res = await fetchInternalMessages({ folder: 'inbox', user_id: String(me.id || '').trim(), kind: 'chat' });
        const next = (res?.data ?? []).filter((m: any) => msgToId(m) === String(me.id || '').trim());
        setInbox(next);

        const prevIds = prevInboxIdsRef.current;
        const nextIds = new Set(next.map((m: any) => msgId(m)).filter(Boolean));
        prevInboxIdsRef.current = nextIds;

        const newUnread = next.filter((m: any) => {
          const id = msgId(m);
          if (!id) return false;
          if (prevIds.has(id)) return false;
          return !msgReadAt(m);
        });

        const last = newUnread[newUnread.length - 1] as any;
        if (last) {
          const from = msgFromId(last);
          if (from) {
            setActiveUserId(from);
            setActiveMeta({});
            setOpen(true);
            ensureUserDetails(from);
            playSound('/sounds/message.mp3', { volume: 0.6 });
            setTimeout(scrollToBottom, 0);
          }
        }
      } catch {
        // ignore
      }
    };

    inboxTickRef.current = tick;
    tick();

    if (realtimeActive) return;
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [me.id, realtimeActive]);

  useEffect(() => {
    if (!me.id || chatDisabled) return;
    if (!open) return;

    const tick = async () => {
      try {
        const res = await fetchInternalMessages({ folder: 'sent', user_id: String(me.id || '').trim(), kind: 'chat' });
        const next = (res?.data ?? []).filter((m: any) => msgFromId(m) === String(me.id || '').trim());
        setSent(next);
      } catch {
        // ignore
      }
    };

    sentTickRef.current = tick;
    tick();

    if (realtimeActive) return;
    const id = window.setInterval(tick, 7000);
    return () => window.clearInterval(id);
  }, [me.id, open, realtimeActive]);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const e = ev as CustomEvent<ChatOpenEventDetail>;
      const id = String(e?.detail?.userId ?? '').trim();
      if (!id) return;

      setActiveUserId(id);
      setActiveMeta({ name: e?.detail?.name, email: e?.detail?.email });
      setOpen(true);
      ensureUserDetails(id);
      setTimeout(scrollToBottom, 0);
    };

    window.addEventListener('nexterp:chat:open', onOpen as EventListener);
    return () => window.removeEventListener('nexterp:chat:open', onOpen as EventListener);
  }, [me.id]);

  useEffect(() => {
    if (!ready) return;
    if (!me.id || chatDisabled) return;

    const cfg = getPusherConfig();
    if (!cfg) {
      setRealtimeActive(false);
      return;
    }

    let alive = true;

    (async () => {
      try {
        await ensureCsrfCookie();
        if (!alive) return;

        (window as any).Pusher = Pusher as any;

        const token = getCookie('XSRF-TOKEN');
        const authHeaders: Record<string, string> = {
          'X-Requested-With': 'XMLHttpRequest',
        };
        if (token) authHeaders['X-XSRF-TOKEN'] = decodeURIComponent(token);

        const echo = new (Echo as any)({
          broadcaster: 'pusher',
          key: cfg.key,
          cluster: cfg.cluster,
          forceTLS: cfg.forceTLS,
          wsHost: cfg.host || undefined,
          wsPort: cfg.port,
          wssPort: cfg.port,
          enabledTransports: ['ws', 'wss'],
          authEndpoint: '/broadcasting/auth',
          auth: { headers: authHeaders },
          withCredentials: true,
        });

        echoRef.current = echo;

        echo
          .private(`messages.${String(me.id)}`)
          .listen('.message.sent', () => {
            inboxTickRef.current?.();
            if (open) sentTickRef.current?.();
            if (open && activeUserId) loadThread({ reset: true });
          })
          .listen('.message.reactions.updated', () => {
            inboxTickRef.current?.();
            if (open) sentTickRef.current?.();
            if (open && activeUserId) loadThread({ reset: true });
          });

        setRealtimeActive(true);
      } catch {
        setRealtimeActive(false);
      }
    })();

    return () => {
      alive = false;
      try {
        const echo = echoRef.current;
        if (echo) {
          echo.leave(`private-messages.${String(me.id)}`);
          echo.leave(`messages.${String(me.id)}`);
          echo.disconnect();
        }
      } catch {
        // ignore
      }
      echoRef.current = null;
    };
  }, [chatDisabled, me.id, open, ready]);

  useEffect(() => {
    if (!open || !activeUserId || !me.id) return;

    const unreadFromThisUser = inbox.filter((m: any) => msgFromId(m) === String(activeUserId) && !msgReadAt(m));
    if (unreadFromThisUser.length === 0) return;

    (async () => {
      for (const m of unreadFromThisUser as any[]) {
        const id = msgId(m);
        if (!id) continue;
        try {
          await markInternalMessageRead(id);
        } catch {
          // ignore
        }
      }
    })();
  }, [activeUserId, inbox, me.id, open]);

  const loadThread = async (opts?: { reset?: boolean }) => {
    const other = String(activeUserId || '').trim();
    const meId = String(me.id || '').trim();
    if (!other || !meId) return;

    const reset = Boolean(opts?.reset);
    if (!reset && !threadHasMore) return;
    if (threadLoadingOlderRef.current) return;

    threadLoadingOlderRef.current = true;
    setThreadLoadingOlder(true);

    const el = listRef.current;
    const beforeHeight = el?.scrollHeight ?? 0;
    const beforeTop = el?.scrollTop ?? 0;
    const wasNearBottom = reset ? true : isNearBottom();

    try {
      const resp = await fetchChatThread({
        other_user_id: other,
        limit: 30,
        cursor: reset ? null : threadCursor,
      });

      const incoming = Array.isArray(resp.items) ? resp.items : [];
      const itemsAsc = incoming.slice().sort((a: any, b: any) => {
        const ta = Date.parse(msgWhenIso(a as any)) || 0;
        const tb = Date.parse(msgWhenIso(b as any)) || 0;
        if (ta !== tb) return ta - tb;
        return msgId(a as any).localeCompare(msgId(b as any));
      });

      setThread((prev) => {
        const map = new Map<string, any>();
        const add = (m: any) => {
          const id = msgId(m);
          if (!id) return;
          map.set(id, m);
        };

        if (!reset) prev.forEach(add);
        itemsAsc.forEach(add);

        const next = Array.from(map.values());
        next.sort((a: any, b: any) => {
          const ta = Date.parse(msgWhenIso(a)) || 0;
          const tb = Date.parse(msgWhenIso(b)) || 0;
          if (ta !== tb) return ta - tb;
          return msgId(a).localeCompare(msgId(b));
        });
        return next;
      });

      setThreadCursor(resp.nextCursor);
      setThreadHasMore(Boolean(resp.hasMore));

      requestAnimationFrame(() => {
        const el2 = listRef.current;
        if (!el2) return;

        if (reset || wasNearBottom) {
          scrollToBottom();
          return;
        }

        const afterHeight = el2.scrollHeight;
        const delta = afterHeight - beforeHeight;
        el2.scrollTop = beforeTop + delta;
      });
    } catch {
      return;
    } finally {
      threadLoadingOlderRef.current = false;
      setThreadLoadingOlder(false);
    }
  };

  useEffect(() => {
    if (!pendingFile) {
      setPendingPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(pendingFile);
    setPendingPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  useEffect(() => {
    if (!open) return;
    if (!activeUserId || !me.id) {
      setThread([]);
      setThreadCursor(null);
      setThreadHasMore(false);
      return;
    }

    setThread([]);
    setThreadCursor(null);
    setThreadHasMore(false);
    setPendingFile(null);
    loadThread({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, me.id, open]);

  useEffect(() => {
    if (!open) return;
    setTimeout(scrollToBottom, 0);
  }, [open, conversation.length]);

  const onDelete = (m: any) => {
    const id = msgId(m);
    if (!id) return;
    setPendingDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    const id = String(pendingDeleteId || '').trim();
    if (!id) return;

    setDeleting(true);
    try {
      await deleteInternalMessageRecipient(id);
      setInbox((prev) => prev.filter((x: any) => msgId(x) !== id));
      setSent((prev) => prev.filter((x: any) => msgId(x) !== id));
      setDeleteOpen(false);
      setPendingDeleteId(null);
    } catch {
      return;
    } finally {
      setDeleting(false);
    }
  };

  const applyReactionUpdate = (recipientId: string, reactions: any[]) => {
    const rid = String(recipientId || '').trim();
    if (!rid) return;

    setInbox((prev) => prev.map((m: any) => (msgId(m) === rid ? ({ ...m, reactions } as any) : m)));
    setSent((prev) => prev.map((m: any) => (msgId(m) === rid ? ({ ...m, reactions } as any) : m)));
    setThread((prev) => prev.map((m: any) => (msgId(m) === rid ? ({ ...m, reactions } as any) : m)));
  };

  const toggleReaction = async (recipientId: string, emoji: string, reactedByMe: boolean) => {
    const rid = String(recipientId || '').trim();
    const e = String(emoji || '').trim();
    if (!rid || !e) return;

    try {
      if (reactedByMe) {
        const resp = await removeInternalMessageReaction(rid, e);
        applyReactionUpdate(rid, (resp.data as any)?.reactions ?? []);
      } else {
        const resp = await addInternalMessageReaction(rid, e);
        applyReactionUpdate(rid, (resp.data as any)?.reactions ?? []);
      }
    } catch {
      return;
    }
  };

  const onSend = async () => {
    const to = String(activeUserId || '').trim();
    const text = draft.trim();
    const file = pendingFile;

    if (!to) return;
    if (!canSend) return;
    if (!file && !text) return;

    const nowIso = new Date().toISOString();
    const tempId = file ? `local_${Date.now()}_${Math.random().toString(16).slice(2)}` : '';

    if (file && tempId) {
      const optimistic = {
        id: tempId,
        from_user_id: String(me.id || '').trim(),
        to_user_id: to,
        subject: '(Chat)',
        body: text,
        folder: 'sent',
        read_at: null,
        sent_at: nowIso,
        created_at: nowIso,
        updated_at: nowIso,
        attachments: [
          {
            id: tempId,
            filename: file.name,
            original_filename: file.name,
            mime_type: file.type || 'image/*',
            file_size: file.size || 0,
            url: pendingPreviewUrl,
          },
        ],
        reactions: [],
        _local_status: 'uploading',
      } as any;

      setThread((prev) => [...prev, optimistic]);
      setSent((prev) => [...prev, optimistic]);
      setTimeout(scrollToBottom, 0);
    }

    setSending(true);
    try {
      const res = file
        ? await sendInternalMessageWithAttachment({
            to_user_id: to,
            subject: '(Chat)',
            body: text,
            file,
          })
        : await sendInternalMessage({
            to_user_id: to,
            subject: '(Chat)',
            body: text,
            thread_id: null,
          });

      const created = res?.data as any;

      if (created) {
        if (tempId) {
          setThread((prev) => prev.map((m: any) => (msgId(m) === tempId ? created : m)));
          setSent((prev) => prev.map((m: any) => (msgId(m) === tempId ? created : m)));
        } else {
          setThread((prev) => [...prev, created]);
          setSent((prev) => [...prev, created]);
        }
      }

      setDraft('');
      setPendingFile(null);
      setTimeout(scrollToBottom, 0);
    } catch {
      if (tempId) {
        setThread((prev) => prev.filter((m: any) => msgId(m) !== tempId));
        setSent((prev) => prev.filter((m: any) => msgId(m) !== tempId));
      }
      throw new Error('Falha ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  if (chatDisabled) return null;

  const isMinimized = !open;

  return (
    <div className={cn('fixed z-[220]', !open || !isMobile ? 'bottom-4 right-4' : 'inset-0')}>
      {isMinimized ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="default"
          className={cn(
            'h-12 w-12 rounded-full p-0 relative shadow-lg border border-border/50 bg-gradient-to-br from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 transition-colors',
            unreadCount > 0 && 'ring-2 ring-rose-500/30',
          )}
          title="Abrir chat"
        >
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[11px] leading-5 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      ) : (
        <div className={cn('w-[380px] max-w-[calc(100vw-2rem)]', isMobile && 'w-screen max-w-none h-svh')}>
          <div
            className={cn(
              'glass-card p-4 rounded-2xl border border-border/60 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/50',
              isMobile && 'h-svh w-screen max-w-none rounded-none p-0 flex flex-col border-0 shadow-none',
            )}
          >
            <div
              className={cn(
                'flex items-start justify-between gap-3 pb-3 border-b border-border/60',
                isMobile && 'p-4 pb-4 border-b border-border/60 shrink-0',
              )}
            >
              <div className="flex-1 min-w-0">
                {activeUserId ? (
                  <div className="flex gap-2 items-start">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setActiveUserId('');
                        setActiveMeta({});
                        setPendingFile(null);
                      }}
                      className="rounded-full hover:bg-muted/60 shrink-0"
                      title="Voltar"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{`Chat com ${activeUser.name}`}</div>
                      <div className="text-xs truncate text-muted-foreground">{activeUser.email}</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm font-semibold truncate">Conversas</div>
                    <div className="text-xs truncate text-muted-foreground">{realtimeActive ? 'Tempo real' : 'A atualizar…'}</div>
                    <div className="flex gap-2 items-center mt-2">
                      <Search className="w-4 h-4 text-muted-foreground" />
                      <Input
                        value={conversationSearch}
                        onChange={(e) => setConversationSearch(e.target.value)}
                        placeholder="Pesquisar conversas…"
                        className="h-9 bg-background/60 border-border/60"
                      />
                    </div>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full hover:bg-muted/60"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div
              ref={listRef}
              onScroll={() => {
                const el = listRef.current;
                if (!el) return;
                if (!activeUserId) return;
                if (el.scrollTop > 60) return;
                if (!threadHasMore) return;
                if (threadLoadingOlderRef.current) return;
                loadThread();
              }}
              onDragOver={(e) => {
                if (!activeUserId || !canSend) return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (!activeUserId || !canSend) return;
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0] ?? null;
                if (!f) return;
                if (String(f.type || '').toLowerCase().startsWith('image/')) setPendingFile(f);
              }}
              className={cn(
                'mt-4 h-[300px] overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-3 space-y-3',
                isMobile && 'mt-0 flex-1 min-h-0 rounded-none border-0 bg-background/40 p-4',
              )}
            >
              {!activeUserId ? (
                visibleConversations.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Sem conversas ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {visibleConversations.map((c) => {
                      const selected = String(c.userId) === String(activeUserId);
                      const photo = resolvePhotoUrl(userDetailsById[c.userId]?.photo_path ?? null) || '';
                      return (
                        <div
                          key={c.userId}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setActiveUserId(String(c.userId));
                            setActiveMeta({});
                            ensureUserDetails(String(c.userId));
                            setTimeout(scrollToBottom, 0);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setActiveUserId(String(c.userId));
                              setActiveMeta({});
                              ensureUserDetails(String(c.userId));
                              setTimeout(scrollToBottom, 0);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2 hover:bg-background/70 transition-colors cursor-pointer select-none',
                            selected && 'border-cyan-500/30 bg-cyan-500/5',
                          )}
                        >
                          <Avatar className="w-9 h-9 border border-border shrink-0">
                            <AvatarImage src={photo} alt={c.name} />
                            <AvatarFallback className="text-[11px] font-semibold">{getInitials(c.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex gap-2 justify-between items-center">
                              <div className="text-sm font-medium truncate">{c.name}</div>
                              <div className="text-[11px] text-muted-foreground shrink-0">{c.lastTime}</div>
                            </div>
                            <div className="text-xs truncate text-muted-foreground">{c.preview}</div>
                          </div>
                          {c.unread > 0 ? (
                            <div className="shrink-0 h-5 min-w-5 px-1 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 text-[11px] leading-5 text-center">
                              {c.unread > 99 ? '99+' : c.unread}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                )
              ) : conversation.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem mensagens ainda.</div>
              ) : (
                conversation.map((m: any) => {
                  const id = msgId(m);
                  const from = msgFromId(m);
                  const mine = from === me.id;
                  const isLocal = Boolean((m as any)?._local_status);
                  const text = plainTextFromHtml(String(m?.body ?? ''));
                  const time = fmtTime(msgWhenIso(m));
                  const read = mine ? Boolean(msgReadAt(m)) : false;
                  const attachments = Array.isArray((m as any)?.attachments) ? ((m as any).attachments as any[]) : [];
                  const imgAttachment =
                    attachments.find((a) => String(a?.mime_type ?? '').toLowerCase().startsWith('image/')) ?? null;
                  const imgLoading = Boolean(imgAttachment) && (isLocal || imgLoadingByMsgId[id] !== false);
                  const reactions = Array.isArray((m as any)?.reactions) ? ((m as any).reactions as any[]) : [];

                  const meta = mine
                    ? { name: me.name || 'Eu', photo_path: me.photo_path }
                    : {
                        name:
                          userDetailsById[from]?.name ||
                          userById.get(from)?.name ||
                          activeUser.name ||
                          'Utilizador',
                        photo_path: userDetailsById[from]?.photo_path ?? null,
                      };

                  const img = resolvePhotoUrl(meta.photo_path) || '';

                  return (
                    <div key={id} className={cn('flex gap-2 items-end', mine ? 'justify-end' : 'justify-start')}>
                      {!mine ? (
                        <Avatar className="w-8 h-8 border border-border shrink-0">
                          <AvatarImage src={img} alt={meta.name} />
                          <AvatarFallback className="text-[11px] font-semibold">{getInitials(meta.name)}</AvatarFallback>
                        </Avatar>
                      ) : null}

                      <div
                        className={cn(
                          'max-w-[78%] rounded-2xl px-3 py-2 text-sm border shadow-sm',
                          mine
                            ? 'bg-gradient-to-br from-cyan-500/15 to-fuchsia-500/10 text-foreground border-cyan-500/20'
                            : 'bg-muted/80 text-foreground border-border',
                        )}
                      >
                        {imgAttachment ? (
                          <div className={cn('relative overflow-hidden rounded-xl bg-muted/70', text ? 'mb-2' : '')}>
                            <img
                              src={String(imgAttachment?.url ?? '')}
                              alt={String(imgAttachment?.original_filename ?? 'Imagem')}
                              className="object-cover w-full h-auto max-h-[240px]"
                              loading="lazy"
                              onLoad={() => setImgLoadingByMsgId((prev) => ({ ...prev, [id]: false }))}
                              onError={() => setImgLoadingByMsgId((prev) => ({ ...prev, [id]: false }))}
                            />
                            {imgLoading ? (
                              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                <div className="h-6 w-6 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {text ? <div className="whitespace-pre-wrap break-words">{text}</div> : null}

                        {reactions.length ? (
                          <div className={cn('flex flex-wrap gap-1 mt-1', mine ? 'justify-end' : 'justify-start')}>
                            {reactions.map((r: any) => (
                              <button
                                key={`${id}_${String(r.emoji)}`}
                                type="button"
                                className={cn(
                                  'px-2 py-0.5 text-[12px] rounded-full border',
                                  r?.reacted_by_me ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-border/60 bg-background/40',
                                )}
                                disabled={isLocal}
                                onClick={() => {
                                  if (isLocal) return;
                                  toggleReaction(id, String(r.emoji), Boolean(r?.reacted_by_me));
                                }}
                              >
                                {String(r.emoji)} {Number(r.count) || 0}
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className={cn('flex flex-wrap gap-1 mt-1', mine ? 'justify-end' : 'justify-start')}>
                          {['👍', '😂', '❤️', '🔥'].map((emo) => {
                            const existing = reactions.find((r: any) => String(r?.emoji ?? '') === emo);
                            const reactedByMe = Boolean(existing?.reacted_by_me);
                            return (
                              <button
                                key={`${id}_${emo}_btn`}
                                type="button"
                                className={cn(
                                  'px-2 py-0.5 text-[12px] rounded-full border',
                                  reactedByMe ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-border/60 bg-background/40',
                                )}
                                disabled={isLocal}
                                onClick={() => {
                                  if (isLocal) return;
                                  toggleReaction(id, emo, reactedByMe);
                                }}
                              >
                                {emo}
                              </button>
                            );
                          })}
                        </div>

                        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-70">
                          <span>{time}</span>
                          {mine ? <span>{read ? '✓✓' : '✓'}</span> : null}
                          {!isLocal ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => onDelete(m)}
                              title="Apagar"
                              className="p-0 w-6 h-6"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          ) : null}
                        </div>
                      </div>

                      {mine ? (
                        <Avatar className="w-8 h-8 border border-border shrink-0">
                          <AvatarImage src={resolvePhotoUrl(me.photo_path) || ''} alt={me.name || 'Eu'} />
                          <AvatarFallback className="text-[11px] font-semibold">{getInitials(me.name || 'Eu')}</AvatarFallback>
                        </Avatar>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>

            <div
              className={cn(
                'mt-3 space-y-2',
                isMobile && 'mt-0 shrink-0 border-t border-border/60 p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]',
              )}
            >
              <div className="flex flex-wrap gap-0.5 pb-1">
                {['😀', '😂', '😍', '👍', '🙏', '🎉', '🔥', '😢'].map((emo) => (
                  <Button
                    key={emo}
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="px-1 h-8"
                    disabled={!activeUserId || sending || !canSend}
                    onClick={() => setDraft((prev) => `${prev}${emo}`)}
                  >
                    <span className="text-base leading-none">{emo}</span>
                  </Button>
                ))}
              </div>

              {pendingFile && pendingPreviewUrl ? (
                <div className="flex gap-2 items-center p-2 rounded-md border border-border/60 bg-background/40">
                  <div className="overflow-hidden w-10 h-10 rounded-md bg-muted">
                    <img src={pendingPreviewUrl} alt="Pré-visualização" className="object-cover w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0 text-xs truncate text-muted-foreground">{pendingFile.name}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8"
                    onClick={() => setPendingFile(null)}
                    disabled={sending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}

              <div className="flex gap-2 items-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (f) setPendingFile(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!activeUserId || sending || !canSend}
                  onClick={() => fileInputRef.current?.click()}
                  title="Enviar imagem"
                  className="bg-background/60 border-border/60 hover:bg-background/80"
                >
                  <ImagePlus className="w-4 h-4" />
                </Button>
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onPaste={(e) => {
                    if (!activeUserId || !canSend) return;
                    const f = e.clipboardData?.files?.[0] ?? null;
                    if (!f) return;
                    if (String(f.type || '').toLowerCase().startsWith('image/')) {
                      e.preventDefault();
                      setPendingFile(f);
                    }
                  }}
                  placeholder={activeUserId ? `Mensagem para ${activeUser.name}…` : 'Mensagem…'}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter') return;
                    e.preventDefault();
                    onSend();
                  }}
                  disabled={!activeUserId || sending || !canSend}
                  className="bg-background/60 border-border/60 focus-visible:ring-1 focus-visible:ring-cyan-400/40"
                />
                <Button
                  type="button"
                  onClick={onSend}
                  disabled={!activeUserId || sending || (!draft.trim() && !pendingFile) || !canSend}
                  className="p-0 w-10 h-10 bg-gradient-to-br from-cyan-500 to-fuchsia-600 rounded-full hover:from-cyan-400 hover:to-fuchsia-500"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {deleteOpen && (
            <div
              className="fixed inset-0 z-[240] flex items-center justify-center bg-black/60 p-4"
              onClick={() => {
                if (deleting) return;
                setDeleteOpen(false);
                setPendingDeleteId(null);
              }}
            >
              <div className="p-6 w-full max-w-sm glass-card" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="text-lg font-semibold">Apagar mensagem?</div>
                  <div className="text-sm text-muted-foreground">Deseja apagar esta mensagem?</div>
                </div>

                <div className="flex gap-2 justify-end mt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDeleteOpen(false);
                      setPendingDeleteId(null);
                    }}
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" variant="destructive" onClick={confirmDelete} disabled={deleting}>
                    Eliminar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}