import { useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ImagePlus, MessageSquare, Send, X } from "lucide-react"

import type { InternalMessage } from "@/types"
import {
  addInternalMessageReaction,
  fetchAdminUser,
  fetchChatThread,
  fetchCommunicationRecipients,
  fetchInternalMessages,
  fetchMyAccess,
  fetchUser,
  markInternalMessageRead,
  removeInternalMessageReaction,
  sendInternalMessage,
  sendInternalMessageWithAttachment,
  type ChatThreadCursor,
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
  const [meIsAdmin, setMeIsAdmin] = useState(false)
  const [meCanWrite, setMeCanWrite] = useState(false)
  const [users, setUsers] = useState<CommunicationRecipient[]>([])
  const [all, setAll] = useState<InternalMessage[]>([])

  const [userDetailsById, setUserDetailsById] = useState<
    Record<string, { name?: string; email?: string; photo_path?: string | null; role?: string | null; is_admin?: boolean }>
  >({})
  const userDetailsRef = useRef<Record<string, { name?: string; email?: string; photo_path?: string | null; role?: string | null; is_admin?: boolean }>>({})

  const [activeUserId, setActiveUserId] = useState<string>("")
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)

  const [thread, setThread] = useState<InternalMessage[]>([])
  const [threadCursor, setThreadCursor] = useState<ChatThreadCursor | null>(null)
  const [threadHasMore, setThreadHasMore] = useState(false)
  const [threadLoadingOlder, setThreadLoadingOlder] = useState(false)
  const threadLoadingRef = useRef(false)

  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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
    return thread
  }, [thread])

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
          role: (u.role ?? prev[uid]?.role ?? null) as any,
          is_admin: (u.is_admin ?? prev[uid]?.is_admin ?? undefined) as any,
        },
      }))
    } catch {
      return
    }
  }

  const scrollToBottom = () => {
    const el = listRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }

  const loadThread = async (opts?: { reset?: boolean }) => {
    const other = String(activeUserId || "").trim()
    const me = String(meId || "").trim()
    if (!other || !me) return

    const reset = Boolean(opts?.reset)
    if (!reset && !threadHasMore) return
    if (threadLoadingRef.current) return

    threadLoadingRef.current = true
    setThreadLoadingOlder(true)

    const el = listRef.current
    const beforeHeight = el?.scrollHeight ?? 0
    const beforeTop = el?.scrollTop ?? 0

    try {
      const resp = await fetchChatThread({
        other_user_id: other,
        limit: 40,
        cursor: reset ? null : threadCursor,
      })

      const incoming = Array.isArray(resp.items) ? resp.items : []
      const itemsAsc = incoming
        .slice()
        .sort((a: any, b: any) => {
          const ta = Date.parse(msgWhenIso(a)) || 0
          const tb = Date.parse(msgWhenIso(b)) || 0
          if (ta !== tb) return ta - tb
          return String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
        })

      setThread((prev) => {
        const map = new Map<string, any>()
        const add = (m: any) => {
          const id = String(m?.id ?? "").trim()
          if (!id) return
          map.set(id, m)
        }
        if (!reset) prev.forEach(add)
        itemsAsc.forEach(add)
        const next = Array.from(map.values())
        next.sort((a: any, b: any) => {
          const ta = Date.parse(msgWhenIso(a)) || 0
          const tb = Date.parse(msgWhenIso(b)) || 0
          if (ta !== tb) return ta - tb
          return String(a?.id ?? "").localeCompare(String(b?.id ?? ""))
        })
        return next
      })

      setThreadCursor(resp.nextCursor)
      setThreadHasMore(Boolean(resp.hasMore))

      requestAnimationFrame(() => {
        const el2 = listRef.current
        if (!el2) return

        if (reset) {
          scrollToBottom()
          return
        }

        const afterHeight = el2.scrollHeight
        const delta = afterHeight - beforeHeight
        el2.scrollTop = beforeTop + delta
      })
    } catch {
      return
    } finally {
      threadLoadingRef.current = false
      setThreadLoadingOlder(false)
    }
  }

  const loadAll = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    try {
      const meResp = await fetchUser()
      const nextMeId = String(meResp.data.id)
      setMeId(nextMeId)
      setMeName(String((meResp as any)?.data?.name ?? "").trim())
      setMePhotoPath(((meResp as any)?.data?.photo_path ?? null) as any)

      const access = await fetchMyAccess()
      const isAdmin = Boolean(access?.data?.isAdmin)
      const perms = Array.isArray(access?.data?.permissions) ? access.data.permissions : []
      const canWrite = isAdmin || perms.includes("*") || perms.includes("communication.messages.write")

      setMeIsAdmin(isAdmin)
      setMeCanWrite(canWrite)

      const recResp = await fetchCommunicationRecipients()
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
            role: (u?.role ?? next[id]?.role ?? null) as any,
            is_admin: (u?.is_admin ?? next[id]?.is_admin ?? undefined) as any,
          }
        })
        return next
      })

      const [inboxResp, sentResp] = await Promise.all([
        fetchInternalMessages({ folder: "inbox", user_id: nextMeId, kind: "chat" }),
        fetchInternalMessages({ folder: "sent", user_id: nextMeId, kind: "chat" }),
      ])

      const safeInbox = (inboxResp.data ?? []).filter((m: any) => String(m?.to_user_id ?? '').trim() === nextMeId)
      const safeSent = (sentResp.data ?? []).filter((m: any) => String(m?.from_user_id ?? '').trim() === nextMeId)
      const map = new Map<string, InternalMessage>()
      ;[...safeInbox, ...safeSent].forEach((m: any) => map.set(String(m.id), m))
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
    if (!activeUserId) {
      setThread([])
      setThreadCursor(null)
      setThreadHasMore(false)
      return
    }

    setThread([])
    setThreadCursor(null)
    setThreadHasMore(false)

    ensureUserDetails(activeUserId)
    loadThread({ reset: true })

    const id = window.setInterval(() => {
      loadAll({ silent: true })
      loadThread({ reset: true })
    }, 4000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, meId])

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
      setThread((prev) => prev.map((m: any) => byId.get(String(m.id)) ?? m))
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
    if (!pendingFile) {
      setPendingPreviewUrl("")
      return
    }

    const url = URL.createObjectURL(pendingFile)
    setPendingPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [pendingFile])

  useEffect(() => {
    if (!listRef.current) return
    if (threadLoadingOlder) return
    requestAnimationFrame(() => {
      if (!listRef.current) return
      listRef.current.scrollTop = listRef.current.scrollHeight
    })
  }, [conversation.length, threadLoadingOlder])

  const onSend = async () => {
    const to = String(activeUserId || "").trim()
    const text = draft.trim()
    const file = pendingFile

    if (!to) {
      toast({ title: "Validação", description: "Seleciona um utilizador para conversar.", variant: "destructive" })
      return
    }

    if (!file && !text) return

    const otherIsAdmin = (() => {
      const rec: any = userById.get(to)
      const cached: any = userDetailsById[to]
      const role = String(cached?.role ?? rec?.role ?? "").trim().toLowerCase()
      const isAdminFlag = Boolean(cached?.is_admin ?? rec?.is_admin ?? false)
      return isAdminFlag || role === "admin"
    })()

    if (!meIsAdmin) {
      const first = conversation[0] as any
      const firstFrom = String(first?.from_user_id ?? "").trim()
      const initiatedByOther = Boolean(first && firstFrom === to)

      if (!initiatedByOther || !otherIsAdmin) {
        toast({
          title: "Ação não permitida",
          description: "No chat, colaboradores só podem responder conversas iniciadas por utilizadores do módulo Admin.",
          variant: "destructive",
        })
        return
      }
    }

    setSending(true)
    try {
      if (file) {
        await sendInternalMessageWithAttachment({
          to_user_id: to,
          subject: "(Chat)",
          body: text,
          file,
        })
      } else {
        await sendInternalMessage({
          to_user_id: to,
          subject: "(Chat)",
          body: text,
          thread_id: null,
        })
      }

      setDraft("")
      setPendingFile(null)
      await loadAll({ silent: true })
      await loadThread({ reset: true })
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível enviar a mensagem", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const applyReactionUpdate = (recipientId: string, reactions: any[]) => {
    const rid = String(recipientId || "").trim()
    if (!rid) return

    const patch = (m: any) => {
      if (String(m?.id ?? "") !== rid) return m
      return { ...m, reactions }
    }

    setAll((prev) => prev.map(patch))
    setThread((prev) => prev.map(patch))
  }

  const toggleReaction = async (recipientId: string, emoji: string, reactedByMe: boolean) => {
    const rid = String(recipientId || "").trim()
    const e = String(emoji || "").trim()
    if (!rid || !e) return

    try {
      if (reactedByMe) {
        const resp = await removeInternalMessageReaction(rid, e)
        applyReactionUpdate(rid, (resp.data as any)?.reactions ?? [])
      } else {
        const resp = await addInternalMessageReaction(rid, e)
        applyReactionUpdate(rid, (resp.data as any)?.reactions ?? [])
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err?.message || "Não foi possível reagir", variant: "destructive" })
    }
  }

  const activeUser = activeUserId ? userById.get(String(activeUserId)) : null

  const canSend = useMemo(() => {
    const other = String(activeUserId || "").trim()
    if (!other) return false
    return meCanWrite
  }, [activeUserId, meCanWrite])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Chat</h1>
        <p className="page-subtitle">Conversas em tempo real (via mensagens internas)</p>
        <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
      </div>

      <div className="p-6 space-y-4 glass-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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

          <div className="flex gap-2 justify-end items-center">
            <Button variant="outline" onClick={() => loadAll()} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/40">
          <div className="flex gap-2 items-center px-4 py-3 border-b border-border/60">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">
                {activeUser ? `Chat com ${activeUser.name}` : "Seleciona um utilizador"}
              </div>
              <div className="text-xs truncate text-muted-foreground">{activeUser?.email ?? ""}</div>
            </div>
          </div>

          <div
            ref={listRef}
            onScroll={() => {
              const el = listRef.current
              if (!el) return
              if (!activeUserId) return
              if (el.scrollTop > 60) return
              if (!threadHasMore) return
              if (threadLoadingRef.current) return
              loadThread()
            }}
            className="h-[420px] overflow-y-auto p-4 space-y-2"
          >
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
                const attachments = Array.isArray((m as any)?.attachments) ? ((m as any).attachments as any[]) : []
                const imgAttachment = attachments.find((a) => String(a?.mime_type ?? "").toLowerCase().startsWith("image/")) ?? null
                const reactions = Array.isArray((m as any)?.reactions) ? ((m as any).reactions as any[]) : []

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
                  <div key={String(m.id)} className={cn("flex gap-2 items-end", mine ? "justify-end" : "justify-start")}>
                    {!mine ? (
                      <Avatar className="w-8 h-8 border border-border shrink-0">
                        <AvatarImage src={img} alt={meta.name} />
                        <AvatarFallback className="text-[11px] font-semibold">{getInitials(meta.name)}</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className="max-w-[82%]">
                      <div
                        className={cn(
                          "px-3 py-2 text-sm whitespace-pre-wrap break-words rounded-lg border",
                          mine
                            ? "bg-cyan-500/10 text-foreground border-cyan-500/20"
                            : "bg-muted text-foreground border-border",
                        )}
                      >
                        {imgAttachment ? (
                          <div className={cn("overflow-hidden rounded-md bg-muted", text ? "mb-2" : "")}> 
                            <img
                              src={String(imgAttachment?.url ?? "")}
                              alt={String(imgAttachment?.original_filename ?? "Imagem")}
                              className="object-cover w-full h-auto max-h-[320px]"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        {text ? <div>{text}</div> : null}
                      </div>

                      {reactions.length ? (
                        <div className={cn("flex flex-wrap gap-1 mt-1", mine ? "justify-end" : "justify-start")}>
                          {reactions.map((r: any) => (
                            <button
                              key={`${String(m.id)}_${String(r.emoji)}`}
                              type="button"
                              className={cn(
                                "px-2 py-0.5 text-[12px] rounded-full border",
                                r?.reacted_by_me ? "border-cyan-500/40 bg-cyan-500/10" : "border-border/60 bg-background/40",
                              )}
                              onClick={() => toggleReaction(String(m.id), String(r.emoji), Boolean(r?.reacted_by_me))}
                            >
                              {String(r.emoji)} {Number(r.count) || 0}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className={cn("mt-1 text-[11px] text-muted-foreground", mine ? "text-right" : "text-left")}>
                        {time}
                        {mine ? (
                          <span>
                            {" · "}
                            {m?.read_at ? `Lida ${fmtTime(m.read_at)}` : "Enviada"}
                          </span>
                        ) : null}
                      </div>

                      <div className={cn("flex flex-wrap gap-1 mt-1", mine ? "justify-end" : "justify-start")}>
                        {["👍", "😂", "❤️", "🔥"].map((emo) => {
                          const existing = reactions.find((r: any) => String(r?.emoji ?? "") === emo)
                          const reactedByMe = Boolean(existing?.reacted_by_me)
                          return (
                            <button
                              key={`${String(m.id)}_${emo}_btn`}
                              type="button"
                              className={cn(
                                "px-2 py-0.5 text-[12px] rounded-full border",
                                reactedByMe ? "border-cyan-500/40 bg-cyan-500/10" : "border-border/60 bg-background/40",
                              )}
                              onClick={() => toggleReaction(String(m.id), emo, reactedByMe)}
                            >
                              {emo}
                            </button>
                          )
                        })}
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

          <div className="p-3 space-y-2 border-t border-border/60">
            <div className="flex flex-wrap gap-1">
              {["😀", "😂", "😍", "👍", "🙏", "🎉", "🔥", "😢"].map((emo) => (
                <Button
                  key={emo}
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="px-2 h-8"
                  disabled={!activeUserId || sending || !canSend}
                  onClick={() => setDraft((prev) => `${prev}${emo}`)}
                >
                  <span className="text-base leading-none">{emo}</span>
                </Button>
              ))}
            </div>

            {pendingFile && pendingPreviewUrl ? (
              <div className="flex gap-2 items-center p-2 rounded-md border border-border/60 bg-background/40">
                <div className="overflow-hidden w-12 h-12 rounded-md bg-muted">
                  <img src={pendingPreviewUrl} alt="Pré-visualização" className="object-cover w-full h-full" />
                </div>
                <div className="flex-1 min-w-0 text-xs truncate text-muted-foreground">
                  {pendingFile.name}
                </div>
                <Button type="button" variant="ghost" size="icon" className="w-8 h-8" onClick={() => setPendingFile(null)}>
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
                  const f = e.target.files?.[0] ?? null
                  e.target.value = ""
                  if (f) setPendingFile(f)
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={!activeUserId || sending || !canSend}
                onClick={() => fileInputRef.current?.click()}
                title="Enviar imagem"
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeUser ? `Mensagem para ${activeUser.name}…` : "Mensagem…"}
                disabled={!activeUserId || sending || !canSend}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return
                  e.preventDefault()
                  onSend()
                }}
              />
              <Button
                type="button"
                onClick={onSend}
                disabled={!activeUserId || sending || (!draft.trim() && !pendingFile) || !canSend}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}