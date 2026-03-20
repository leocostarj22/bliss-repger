import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

import type { InternalMessage } from '@/types';
import {
  fetchCommunicationRecipients,
  fetchInternalMessages,
  fetchUser,
  markInternalMessageRead,
  sendInternalMessage,
  type CommunicationRecipient,
} from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, playSound } from '@/lib/utils';

type ChatOpenEventDetail = {
  userId: string;
  name?: string;
  email?: string;
};

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

  const [meId, setMeId] = useState<string>('');
  const [users, setUsers] = useState<CommunicationRecipient[]>([]);

  const [inbox, setInbox] = useState<InternalMessage[]>([]);
  const [sent, setSent] = useState<InternalMessage[]>([]);

  const [open, setOpen] = useState(false);
  const [activeUserId, setActiveUserId] = useState<string>('');
  const [activeMeta, setActiveMeta] = useState<{ name?: string; email?: string }>({});
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inboxRef = useRef<InternalMessage[]>([]);
  const sentRef = useRef<InternalMessage[]>([]);

  useEffect(() => {
    inboxRef.current = inbox;
  }, [inbox]);

  useEffect(() => {
    sentRef.current = sent;
  }, [sent]);

  const userById = useMemo(() => {
    const map = new Map<string, CommunicationRecipient>();
    for (const u of users) map.set(String((u as any).id ?? u.id), u);
    return map;
  }, [users]);

  const activeUser = useMemo(() => {
    const fromMap = userById.get(String(activeUserId));
    if (fromMap) return { name: fromMap.name, email: fromMap.email };
    if (activeUserId) return { name: activeMeta.name ?? activeUserId, email: activeMeta.email ?? '' };
    return { name: 'Chat', email: '' };
  }, [activeMeta.email, activeMeta.name, activeUserId, userById]);

  const unreadCount = useMemo(() => {
    return inbox.reduce((acc, m: any) => (msgReadAt(m) ? acc : acc + 1), 0);
  }, [inbox]);

  const conversation = useMemo(() => {
    if (!meId || !activeUserId) return [];
    const other = String(activeUserId);

    const all = [...inbox, ...sent].filter((m: any) => {
      const from = msgFromId(m);
      const to = msgToId(m);
      return (from === other && to === meId) || (from === meId && to === other);
    });

    return all.sort((a: any, b: any) => {
      const aw = msgWhenIso(a);
      const bw = msgWhenIso(b);
      if (aw && bw) return aw.localeCompare(bw);
      return msgId(a).localeCompare(msgId(b));
    });
  }, [activeUserId, inbox, meId, sent]);

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    if (!open) return;
    scrollToBottom();
  }, [open, conversation.length]);

  const loadUsers = async () => {
    const res = await fetchCommunicationRecipients();
    setUsers(res?.data ?? []);
  };

  const loadInbox = async () => {
    const res = await fetchInternalMessages({ folder: 'inbox' });
    setInbox(res?.data ?? []);
  };

  const loadSent = async () => {
    const res = await fetchInternalMessages({ folder: 'sent' });
    setSent(res?.data ?? []);
  };

  const ensureBoot = async () => {
    try {
      const me = await fetchUser();
      const id = String((me as any)?.data?.id ?? '').trim();
      if (id) setMeId(id);
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    ensureBoot();
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadUsers().catch(() => {});
    loadInbox().catch(() => {});
    loadSent().catch(() => {});
  }, [ready]);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const e = ev as CustomEvent<ChatOpenEventDetail>;
      const detail = e?.detail;
      const id = String(detail?.userId ?? '').trim();
      if (!id) return;

      setActiveUserId(id);
      setActiveMeta({ name: detail?.name, email: detail?.email });
      setOpen(true);
      setTimeout(() => scrollToBottom(), 0);
    };

    window.addEventListener('gmcentral:chat:open', onOpen as EventListener);
    return () => window.removeEventListener('gmcentral:chat:open', onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!meId) return;

    const tick = async () => {
      try {
        const res = await fetchInternalMessages({ folder: 'inbox' });
        const next = res?.data ?? [];

        const prevIds = new Set(inboxRef.current.map((m: any) => msgId(m)));
        const newUnread = next.filter((m: any) => {
          const id = msgId(m);
          if (!id) return false;
          if (prevIds.has(id)) return false;
          return !msgReadAt(m);
        });

        setInbox(next);

        const last = newUnread[newUnread.length - 1];
        if (last) {
          const from = msgFromId(last);
          if (from) {
            setActiveUserId(from);
            setActiveMeta({});
            setOpen(true);
            playSound('/sounds/message.mp3', { volume: 0.35 });
          }
        }
      } catch {
        // ignore
      }
    };

    const id = window.setInterval(tick, 5000);
    return () => window.clearInterval(id);
  }, [meId]);

  useEffect(() => {
    if (!meId || !open) return;

    const tick = async () => {
      try {
        const res = await fetchInternalMessages({ folder: 'sent' });
        setSent(res?.data ?? []);
      } catch {
        // ignore
      }
    };

    const id = window.setInterval(tick, 7000);
    return () => window.clearInterval(id);
  }, [meId, open]);

  useEffect(() => {
    if (!open || !activeUserId) return;

    const unreadFromThisUser = inbox.filter((m: any) => {
      return msgFromId(m) === String(activeUserId) && !msgReadAt(m);
    });

    if (unreadFromThisUser.length === 0) return;

    let cancelled = false;

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
      if (!cancelled) {
        loadInbox().catch(() => {});
        loadSent().catch(() => {});
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, inbox, open]);

  const onSend = async () => {
    const to = String(activeUserId || '').trim();
    const text = draft.trim();
    if (!to || !text) return;

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
      setTimeout(() => scrollToBottom(), 0);
      loadInbox().catch(() => {});
    } finally {
      setSending(false);
    }
  };

  const minimized = !open;

  return (
    <div className="fixed bottom-4 right-4 z-[220]">
      {minimized ? (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          variant="default"
          className="h-12 w-12 rounded-full p-0 relative"
          disabled={!activeUserId && unreadCount === 0}
          title="Abrir chat"
        >
          <MessageSquare className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[11px] leading-5 text-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </Button>
      ) : (
        <div className="w-[360px] max-w-[calc(100vw-2rem)]">
          <div className="glass-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">Chat com {activeUser.name}</div>
                <div className="text-xs text-muted-foreground truncate">{activeUser.email}</div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div
              ref={listRef}
              className="mt-3 h-[260px] overflow-y-auto rounded-md border border-border/60 bg-background/40 p-3 space-y-2"
            >
              {conversation.length === 0 ? (
                <div className="text-xs text-muted-foreground">Sem mensagens ainda.</div>
              ) : (
                conversation.map((m: any) => {
                  const mine = msgFromId(m) === meId;
                  const text = plainTextFromHtml(String(m?.body ?? ''));
                  const time = fmtTime(msgWhenIso(m));
                  const read = mine ? Boolean(msgReadAt(m)) : false;

                  return (
                    <div key={msgId(m)} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-lg px-3 py-2 text-sm border',
                          mine
                            ? 'bg-cyan-500/10 text-foreground border-cyan-500/20'
                            : 'bg-muted text-foreground border-border',
                        )}
                      >
                        <div className="whitespace-pre-wrap break-words">{text}</div>
                        <div className="mt-1 flex items-center justify-end gap-2 text-[11px] opacity-70">
                          <span>{time}</span>
                          {mine ? <span>{read ? '✓✓' : '✓'}</span> : null}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeUserId ? `Mensagem para ${activeUser.name}…` : 'Mensagem…'}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  onSend();
                }}
                disabled={!activeUserId || sending}
              />
              <Button type="button" onClick={onSend} disabled={!activeUserId || !draft.trim() || sending}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}