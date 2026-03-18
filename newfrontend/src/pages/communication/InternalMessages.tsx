import { useEffect, useMemo, useState } from "react"
import { Mail, Send } from "lucide-react"

import type { InternalMessage, User } from "@/types"
import { fetchInternalMessages, fetchUser, fetchUsers, markInternalMessageRead, sendInternalMessage } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"


const fmtDateTime = (iso?: string | null) => {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("pt-PT")
  } catch {
    return String(iso)
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

const isRichTextEmpty = (html: string) => plainTextFromHtml(html).length === 0

const sanitizeHtml = (html: string) => {
  const raw = (html ?? "").toString()
  if (!raw) return ""

  try {
    const doc = new DOMParser().parseFromString(raw, "text/html")
    const remove = doc.querySelectorAll("script, style, iframe, object, embed")
    remove.forEach((n) => n.remove())

    doc.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        const name = attr.name.toLowerCase()
        const value = attr.value
        if (name.startsWith("on")) el.removeAttribute(attr.name)
        if ((name === "href" || name === "src") && /^\s*javascript:/i.test(value)) el.removeAttribute(attr.name)
        if (name === "srcdoc") el.removeAttribute(attr.name)
      })
    })

    return doc.body.innerHTML
  } catch {
    return raw
  }
}

export default function InternalMessages() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [meId, setMeId] = useState<string>("")
  const [users, setUsers] = useState<User[]>([])
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox")
  const [rows, setRows] = useState<InternalMessage[]>([])
  const [selected, setSelected] = useState<InternalMessage | null>(null)

  const [toUserId, setToUserId] = useState<string>("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [sending, setSending] = useState(false)

  const userById = useMemo(() => {
    const m = new Map<string, User>()
    users.forEach((u) => m.set(u.id, u))
    return m
  }, [users])

  const load = async (nextFolder: "inbox" | "sent") => {
    setLoading(true)
    try {
      const [meResp, uResp, mResp] = await Promise.all([
        fetchUser(),
        fetchUsers(),
        fetchInternalMessages({ folder: nextFolder }),
      ])
      const nextMeId = String(meResp.data.id)
      setMeId(nextMeId)
      setUsers(uResp.data)
      setRows(mResp.data)
      setSelected(null)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar mensagens", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(folder)
  }, [folder])

  const recipients = useMemo(() => {
    if (!meId) return []
    return users.filter((u) => u.id !== meId && u.is_active)
  }, [users, meId])

  const onOpen = async (m: InternalMessage) => {
    setSelected(m)
    if (m.to_user_id !== meId) return
    if (m.read_at) return

    try {
      const resp = await markInternalMessageRead(m.id)
      setRows((prev) => prev.map((x) => (x.id === m.id ? resp.data : x)))
      setSelected(resp.data)
    } catch {
      return
    }
  }

  const onSend = async () => {
    if (!toUserId) {
      toast({ title: "Validação", description: "Seleciona o destinatário", variant: "destructive" })
      return
    }
    if (isRichTextEmpty(body)) {
      toast({ title: "Validação", description: "Escreve a mensagem", variant: "destructive" })
      return
    }

    setSending(true)
    try {
      await sendInternalMessage({
        to_user_id: toUserId,
        subject: subject.trim() || "(Sem assunto)",
        body: body,
        thread_id: null,
      })
      setToUserId("")
      setSubject("")
      setBody("")
      toast({ title: "Sucesso", description: "Mensagem enviada" })
      setFolder("sent")
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Mensagens Internas</h1>
        <p className="page-subtitle">Email interno entre utilizadores</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Mail className="w-4 h-4 text-emerald-400" />
          Nova mensagem
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Select value={toUserId} onValueChange={setToUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Destinatário" />
            </SelectTrigger>
            <SelectContent>
              {recipients.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Assunto" />

          <div className="flex items-center justify-end gap-2">
            <Button onClick={onSend} disabled={sending}>
              <Send className="w-4 h-4 mr-2" />
              Enviar
            </Button>
          </div>
        </div>

        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Escreve a tua mensagem…"
          className="min-h-[180px]"
        />
      </div>

      <div className="glass-card p-6">
        <Tabs value={folder} onValueChange={(v) => setFolder(v as "inbox" | "sent")}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <TabsList>
              <TabsTrigger value="inbox">Inbox</TabsTrigger>
              <TabsTrigger value="sent">Enviadas</TabsTrigger>
            </TabsList>
            <Button variant="outline" onClick={() => load(folder)} disabled={loading}>
              Atualizar
            </Button>
          </div>

          <TabsContent value="inbox">
            <MessageList
              loading={loading}
              rows={rows}
              users={userById}
              me={meId}
              selectedId={selected?.id || null}
              onOpen={onOpen}
            />
          </TabsContent>
          <TabsContent value="sent">
            <MessageList
              loading={loading}
              rows={rows}
              users={userById}
              me={meId}
              selectedId={selected?.id || null}
              onOpen={onOpen}
            />
          </TabsContent>
        </Tabs>

        {selected ? (
          <div className="mt-5 rounded-lg border border-border/60 bg-background/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{selected.subject}</div>
                <div className="text-xs text-muted-foreground">
                  {userById.get(selected.from_user_id)?.name || selected.from_user_id} →{" "}
                  {userById.get(selected.to_user_id)?.name || selected.to_user_id}
                  {" · "}
                  {fmtDateTime(selected.sent_at || selected.createdAt)}
                </div>
              </div>
              {selected.read_at ? (
                <div className="text-xs text-muted-foreground">Lida: {fmtDateTime(selected.read_at)}</div>
              ) : (
                <div className="text-xs text-muted-foreground">Não lida</div>
              )}
            </div>
            <div
              className="mt-3 text-sm tiptap ProseMirror min-h-0 p-0"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(selected.body) }}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function MessageList(props: {
  loading: boolean
  rows: InternalMessage[]
  users: Map<string, User>
  me: string
  selectedId: string | null
  onOpen: (m: InternalMessage) => void
}) {
  if (props.loading) return <div className="text-sm text-muted-foreground">A carregar…</div>
  if (props.rows.length === 0) return <div className="text-sm text-muted-foreground">Sem mensagens.</div>

  return (
    <div className="space-y-2">
      {props.rows.map((m) => {
        const fromName = props.users.get(m.from_user_id)?.name || m.from_user_id
        const toName = props.users.get(m.to_user_id)?.name || m.to_user_id
        const unread = m.to_user_id === props.me && !m.read_at

        return (
          <button
            key={m.id}
            type="button"
            onClick={() => props.onOpen(m)}
            className={cn(
              "w-full text-left rounded-lg border border-border/60 bg-background/40 p-3 hover:bg-muted/20 transition-colors",
              props.selectedId === m.id && "ring-1 ring-cyan-400/30",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className={cn("text-sm truncate", unread ? "font-semibold" : "font-medium")}>{m.subject}</div>
                  {unread ? (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/25 dark:text-white">
                      Nova
                    </span>
                  ) : null}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {fromName} → {toName}
                </div>
              </div>
              <div className="text-[11px] text-muted-foreground shrink-0">{fmtDateTime(m.sent_at || m.createdAt)}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}