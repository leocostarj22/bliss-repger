import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, X, Trash2 } from 'lucide-react';

import type { InternalMessage, User as AppUser } from '@/types';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  fetchAdminUser,
  fetchCommunicationRecipients,
  fetchInternalMessages,
  fetchUser,
  markInternalMessageRead,
  sendInternalMessage,
  deleteInternalMessageRecipient,
  type CommunicationRecipient,
} from '@/services/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

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
    if (!meId) return [] as Array<{ userId: string; name: string; email: string; lastTs: number; unread: number }>;

    const latestByUser = new Map<string, number>();
    const all = [...inbox, ...sent];

    all.forEach((m: any) => {
      const from = msgFromId(m);
      const to = msgToId(m);
      if (!from || !to) return;

      const other = from === meId ? to : to === meId ? from : '';
      if (!other || other === meId) return;

      const ts = Date.parse(msgWhenIso(m)) || 0;
      const prev = latestByUser.get(other) ?? 0;
      if (ts > prev) latestByUser.set(other, ts);
    });

    const rows = Array.from(latestByUser.entries()).map(([userId, lastTs]) => {
      const cached = userDetailsById[userId];
      const rec = userById.get(userId);
      const name = String(cached?.name || rec?.name || userId).trim();
      const email = String(cached?.email || rec?.email || '').trim();
      const unread = unreadByUserId[userId] ?? 0;
      return { userId, name, email, lastTs, unread };
    });

    return rows.sort((a, b) => b.lastTs - a.lastTs);
  }, [inbox, sent, me.id, unreadByUserId, userById, userDetailsById]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('gmcentral:chat:unread', { detail: { count: unreadCount } }));
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

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const conversation = useMemo(() => {
    const other = String(activeUserId || '').trim();
    if (!me.id || !other) return [];
    const all = [...inbox, ...sent].filter((m: any) => {
      const from = msgFromId(m);
      const to = msgToId(m);
      return (from === other && to === me.id) || (from === me.id && to === other);
    });

    return all.sort((a: any, b: any) => {
      const ta = Date.parse(msgWhenIso(a)) || 0;
      const tb = Date.parse(msgWhenIso(b)) || 0;
      if (ta !== tb) return ta - tb;
      return msgId(a).localeCompare(msgId(b));
    });
  }, [activeUserId, inbox, me.id, sent]);

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

    tick();
    const id = window.setInterval(tick, 4000);
    return () => window.clearInterval(id);
  }, [me.id]);

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

    tick();
    const id = window.setInterval(tick, 7000);
    return () => window.clearInterval(id);
  }, [me.id, open]);

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

    window.addEventListener('gmcentral:chat:open', onOpen as EventListener);
    return () => window.removeEventListener('gmcentral:chat:open', onOpen as EventListener);
  }, [me.id]);

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

  const onSend = async () => {
    const to = String(activeUserId || '').trim();
    const text = draft.trim();
    if (!to || !text) return;
    if (!canSend) return;

    setSending(true);
    try {
      const res = await sendInternalMessage({
        to_user_id: to,
        subject: '(Chat)',
        body: text,
        thread_id: null,
      });

      const created = res?.data as any;
      if (created) setSent((prev) => [...prev, created]);
      setDraft('');
      setTimeout(scrollToBottom, 0);
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
          <MessageSquare className="h-5 w-5" />
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
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{activeUserId ? `Chat com ${activeUser.name}` : 'Chat'}</div>
                <div className="text-xs text-muted-foreground truncate">{activeUserId ? activeUser.email : ''}</div>
                {conversations.length > 0 ? (
                  <div className="mt-2">
                    <Select
                      value={activeUserId}
                      onValueChange={(id) => {
                        setActiveUserId(String(id));
                        setActiveMeta({});
                        setOpen(true);
                        ensureUserDetails(String(id));
                        setTimeout(scrollToBottom, 0);
                      }}
                    >
                      <SelectTrigger className="h-9 rounded-md bg-background/60 border-border/60 hover:bg-background/80 transition-colors">
                        <SelectValue placeholder="Selecionar conversa…" />
                      </SelectTrigger>
                      <SelectContent>
                        {conversations.map((c) => (
                          <SelectItem key={c.userId} value={c.userId}>
                            {c.name}{c.email ? ` (${c.email})` : ''}{c.unread > 0 ? ` · ${c.unread} nova(s)` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                className="rounded-full hover:bg-muted/60"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={listRef}
              className={cn(
                'mt-4 h-[300px] overflow-y-auto rounded-xl border border-border/60 bg-background/40 p-3 space-y-3',
                isMobile && 'mt-0 flex-1 min-h-0 rounded-none border-0 bg-background/40 p-4',
              )}
            >
              {!activeUserId ? (
                <div className="text-xs text-muted-foreground">Abre um chat a partir de Utilizadores ou responde a uma mensagem recebida.</div>
              ) : conversation.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem mensagens ainda.</div>
              ) : (
                conversation.map((m: any) => {
                  const from = msgFromId(m);
                  const mine = from === me.id;
                  const text = plainTextFromHtml(String(m?.body ?? ''));
                  const time = fmtTime(msgWhenIso(m));
                  const read = mine ? Boolean(msgReadAt(m)) : false;

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
                    <div key={msgId(m)} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
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
                        <div className="whitespace-pre-wrap break-words">{text}</div>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-70">
                          <span>{time}</span>
                          {mine ? <span>{read ? '✓✓' : '✓'}</span> : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(m)}
                            title="Apagar"
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
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
                    className="h-8 px-1"
                    disabled={!activeUserId || sending || !canSend}
                    onClick={() => setDraft((prev) => `${prev}${emo}`)}
                  >
                    <span className="text-base leading-none">{emo}</span>
                  </Button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
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
                  disabled={!activeUserId || !draft.trim() || sending || !canSend}
                  className="h-10 w-10 p-0 rounded-full bg-gradient-to-br from-cyan-500 to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500"
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
              <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2">
                  <div className="text-lg font-semibold">Apagar mensagem?</div>
                  <div className="text-sm text-muted-foreground">Deseja apagar esta mensagem?</div>
                </div>

                <div className="mt-5 flex justify-end gap-2">
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