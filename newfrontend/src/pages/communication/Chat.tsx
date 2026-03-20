import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { MessageSquare, Send } from "lucide-react"

import type { InternalMessage } from "@/types"
import {
  fetchAdminUser,
  fetchCommunicationRecipients,
  fetchInternalMessages,
  fetchUser,
  markInternalMessageRead,
  sendInternalMessage,
  type CommunicationRecipient,
} from "@/services/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn, getInitials, playSound, resolvePhotoUrl } from "@/lib/utils"

const getAny = (m: any, key: string) => (m && Object.prototype.hasOwnProperty.call(m, key) ? m[key] : undefined)

const msgWhenIso = (m: any) =>
  String(m?.sent_at ?? m?.sentAt ?? m?.createdAt ?? getAny(m, "created_at") ?? getAny(m, "createdAt") ?? "").trim()

const fmtTime = (iso?: string | null) => {
  const raw = String(iso ?? "").trim()
  if (!raw) return ""
  try {
    return new Date(raw).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })
  } catch {
    return raw
  }
}

const plainTextFromHtml = (html: string) => {
  const raw = (html ?? "").toString()
  if (!raw.trim()) return ""

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html")
    return (doc.body.textContent ?? "").replace(/\u00A0/g, " ").trim()
  } catch {
    return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  }
}

export default function Chat() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [loading, setLoading] = useState(true)
  const [meId, setMeId] = useState<string>("")
  const [meName, setMeName] = useState("")
  const [mePhotoPath, setMePhotoPath] = useState<string | null>(null)
  const [users, setUsers] = useState<CommunicationRecipient[]>([])
  const [all, setAll] = useState<InternalMessage[]>([])

  const [userDetailsById, setUserDetailsById] = useState<Record<string, { name?: string; email?: string; photo_path?: string | null }>>({})
  const userDetailsRef = useRef<Record<string, { name?: string; email?: string; photo_path?: string | null }>>({})

  const [activeUserId, setActiveUserId] = useState<string>("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const listRef = useRef<HTMLDivElement | null>(null)
  const lastIncomingIdRef = useRef<string | null>(null)

  const userById = useMemo(() => {
    const m = new Map<string, CommunicationRecipient>()
    users.forEach((u) => m.set(String(u.id), u))
    return m
  }, [users])

  const recipients = useMemo(() => {
    if (!meId) return []
    return users.filter((u) => u.is_active && String(u.id) !== meId)
  }, [users, meId])

  const conversation = useMemo(() => {
    const other = String(activeUserId || "").trim()
    if (!meId || !other) return []

    const rows = all
      .filter((m: any) => {
        const from = String(m?.from_user_id ?? "").trim()
        const to = String(m?.to_user_id ?? "").trim()
        return (from === meId && to === other) || (from === other && to === meId)
      })
      .slice()

    rows.sort((a: any, b: any) => {
      const ta = Date.parse(msgWhenIso(a)) || 0
      const tb = Date.parse(msgWhenIso(b)) || 0
      return ta - tb
    })

    return rows
  }, [activeUserId, all, meId])

  const unreadByUserId = useMemo(() => {
    if (!meId) return {}
    const map: Record<string, number> = {}
    for (const m of all as any[]) {
      const from = String(m?.from_user_id ?? "").trim()
      const to = String(m?.to_user_id ?? "").trim()
      if (!from || !to) continue
      if (to !== meId) continue
      if (m?.read_at) continue
      map[from] = (map[from] ?? 0) + 1
    }
    return map
  }, [all, meId])

  useEffect(() => {
    userDetailsRef.current = userDetailsById
  }, [userDetailsById])

  const ensureUserDetails = async (id: string) => {
    const uid = String(id || "").trim()
    if (!uid) return
    if (uid === meId) return

    const current = userDetailsRef.current[uid]
    if (current && (current.photo_path !== undefined || current.name || current.email)) return

    try {
      const resp = await fetchAdminUser(uid)
      const u: any = resp?.data
      if (!u) return
      setUserDetailsById((prev) => ({
        ...prev,
        [uid]: {
          name: String(u.name ?? prev[uid]?.name ?? "").trim(),
          email: String(u.email ?? prev[uid]?.email ?? "").trim(),
          photo_path: (u.photo_path ?? prev[uid]?.photo_path ?? null) as any,
        },
      }))
    } catch {
      return
    }
  }

  const loadAll = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const [meResp, recResp, inboxResp, sentResp] = await Promise.all([
        fetchUser(),
        fetchCommunicationRecipients(),
        fetchInternalMessages({ folder: "inbox" }),
        fetchInternalMessages({ folder: "sent" }),
      ])

      const nextMeId = String(meResp.data.id)
      setMeId(nextMeId)
      setMeName(String((meResp as any)?.data?.name ?? "").trim())
      setMePhotoPath(((meResp as any)?.data?.photo_path ?? null) as any)

      setUsers(recResp.data)
      setUserDetailsById((prev) => {
        const next = { ...prev }
        recResp.data.forEach((u: any) => {
          const id = String(u?.id ?? "").trim()
          if (!id) return
          next[id] = {
            name: String(u?.name ?? next[id]?.name ?? "").trim(),
            email: String(u?.email ?? next[id]?.email ?? "").trim(),
            photo_path: (next[id]?.photo_path ?? null) as any,
          }
        })
        return next
      })

      const map = new Map<string, InternalMessage>()
      ;[...inboxResp.data, ...sentResp.data].forEach((m: any) => map.set(String(m.id), m))
      setAll(Array.from(map.values()))
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível carregar o chat", variant: "destructive" })
    } finally {
      if (!opts?.silent) setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const withUser = String(searchParams.get("with_user_id") ?? "").trim()
    if (!withUser) return
    if (meId && withUser === meId) return
    setActiveUserId(withUser)
  }, [meId, searchParams])

  useEffect(() => {
    if (!activeUserId) return
    ensureUserDetails(activeUserId)
    const id = window.setInterval(() => loadAll({ silent: true }), 4000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId])

  useEffect(() => {
    if (!meId) return
    const ids = new Set<string>()

    for (const m of conversation as any[]) {
      const from = String(m?.from_user_id ?? "").trim()
      const to = String(m?.to_user_id ?? "").trim()
      if (from && from !== meId) ids.add(from)
      if (to && to !== meId) ids.add(to)
    }

    ids.forEach((id) => ensureUserDetails(id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation, meId])

  useEffect(() => {
    const other = String(activeUserId || "").trim()
    if (!other) return

    const unread = conversation.filter((m: any) => String(m?.to_user_id ?? "") === meId && !m?.read_at)
    if (unread.length === 0) return

    Promise.all(
      unread.map((m) =>
        markInternalMessageRead(String(m.id))
          .then((resp) => resp.data)
          .catch(() => null),
      ),
    ).then((updated) => {
      const byId = new Map(updated.filter(Boolean).map((m: any) => [String(m.id), m]))
      if (byId.size === 0) return
      setAll((prev) => prev.map((m: any) => byId.get(String(m.id)) ?? m))
    })
  }, [activeUserId, conversation, meId])

  useEffect(() => {
    const last = conversation[conversation.length - 1] as any
    if (!last) return
    const isIncoming = String(last?.to_user_id ?? "").trim() === meId && String(last?.from_user_id ?? "").trim() === activeUserId
    if (!isIncoming) return

    const lastId = String(last.id)
    if (lastIncomingIdRef.current === lastId) return
    lastIncomingIdRef.current = lastId

    playSound("/sounds/message.mp3", { volume: 0.6 })
  }, [activeUserId, conversation, meId])

  useEffect(() => {
    if (!listRef.current) return
    requestAnimationFrame(() => {
      if (!listRef.current) return
      listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }, [conversation.length])

  const onSend = async () => {
    const to = String(activeUserId || "").trim()
    const text = draft.trim()
    if (!to) {
      toast({ title: "Validação", description: "Seleciona um utilizador para conversar.", variant: "destructive" })
      return
    }
    if (!text) return

    setSending(true)
    try {
      await sendInternalMessage({
        to_user_id: to,
        subject: "(Chat)",
        body: text,
        thread_id: null,
      })
      setDraft("")
      await loadAll({ silent: true })
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível enviar a mensagem", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const activeUser = activeUserId ? userById.get(String(activeUserId)) : null

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Chat</h1>
        <p className="page-subtitle">Conversas em tempo real (via mensagens internas)</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex-1 min-w-0">
            <Select value={activeUserId} onValueChange={setActiveUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar utilizador…" />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((u) => {
                  const unread = unreadByUserId[String(u.id)] ?? 0
                  return (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name} ({u.email}){unread > 0 ? ` · ${unread} nova(s)` : ""}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => loadAll()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/40">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {activeUser ? `Chat com ${activeUser.name}` : "Seleciona um utilizador"}
              </div>
              <div className="text-xs text-muted-foreground truncate">{activeUser?.email ?? ""}</div>
            </div>
          </div>

          <div ref={listRef} className="h-[420px] overflow-y-auto p-4 space-y-2">
            {!activeUserId ? (
              <div className="text-sm text-muted-foreground">Seleciona um utilizador para ver a conversa.</div>
            ) : conversation.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sem mensagens ainda.</div>
            ) : (
              conversation.map((m: any) => {
                const from = String(m?.from_user_id ?? "").trim()
                const mine = from === meId
                const time = fmtTime(msgWhenIso(m))
                const text = plainTextFromHtml(String(m?.body ?? ""))

                const meta = mine
                  ? { name: meName || "Eu", photo_path: mePhotoPath }
                  : {
                      name:
                        userDetailsById[from]?.name ||
                        userById.get(from)?.name ||
                        activeUser?.name ||
                        "Utilizador",
                      photo_path: userDetailsById[from]?.photo_path ?? null,
                    }

                const img = resolvePhotoUrl(meta.photo_path) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(meta.name || "User")}&background=random`

                return (
                  <div key={String(m.id)} className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}>
                    {!mine ? (
                      <Avatar className="w-8 h-8 border border-border shrink-0">
                        <AvatarImage src={img} alt={meta.name} />
                        <AvatarFallback className="text-[11px] font-semibold">{getInitials(meta.name)}</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className="max-w-[82%]">
                      <div
                        className={cn(
                          "rounded-lg px-3 py-2 text-sm border whitespace-pre-wrap break-words",
                          mine
                            ? "bg-cyan-500/10 text-foreground border-cyan-500/20"
                            : "bg-muted text-foreground border-border",
                        )}
                      >
                        {text}
                      </div>
                      <div className={cn("mt-1 text-[11px] text-muted-foreground", mine ? "text-right" : "text-left")}>
                        {time}
                        {mine ? (
                          <span>
                            {" · "}
                            {m?.read_at ? `Lida ${fmtTime(m.read_at)}` : "Enviada"}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {mine ? (
                      <Avatar className="w-8 h-8 border border-border shrink-0">
                        <AvatarImage
                          src={
                            resolvePhotoUrl(mePhotoPath) ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(meName || "Eu")}&background=random`
                          }
                          alt={meName || "Eu"}
                        />
                        <AvatarFallback className="text-[11px] font-semibold">{getInitials(meName || "Eu")}</AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                )
              })
            )}
          </div>

          <div className="p-3 border-t border-border/60 space-y-2">
            <div className="flex flex-wrap gap-1">
              {["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "😢"].map((emo) => (
                <Button
                  key={emo}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2"
                  disabled={!activeUserId || sending}
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
                placeholder={activeUser ? `Mensagem para ${activeUser.name}…` : "Mensagem…"}
                disabled={!activeUserId || sending}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  onSend()
                }}
              />
              <Button type="button" onClick={onSend} disabled={!activeUserId || sending || !draft.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}