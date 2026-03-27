import { useEffect, useState } from "react"
import { useNavigate, useParams, Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { createPersonalNote, fetchPersonalNote, updatePersonalNote } from "@/services/api"
import type { PersonalNote } from "@/types"

const htmlToPlainText = (value: string) => {
  const raw = String(value ?? "")
  if (!raw) return ""

  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return raw.replace(/<[^>]*>/g, "").trim()
  }

  let decoded = raw
  const mayBeEscaped = /&lt;|&#\d+;|&#x[0-9a-f]+;/i.test(raw)
  if (mayBeEscaped) {
    try {
      decoded = new DOMParser().parseFromString(raw, "text/html").documentElement.textContent ?? raw
    } catch {
      decoded = raw
    }
  }

  const looksLikeHtml = /<\s*[a-z][\s\S]*>/i.test(decoded)
  if (!looksLikeHtml) return decoded

  try {
    const normalized = decoded
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\s*\/\s*p\s*>/gi, "\n\n")
      .replace(/<\s*\/\s*li\s*>/gi, "\n")

    const doc = new DOMParser().parseFromString(normalized, "text/html")
    return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim()
  } catch {
    return decoded.replace(/<[^>]*>/g, "").trim()
  }
}

const toLocalDateTimeInput = (iso?: string | null) => {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fromLocalDateTimeInput = (val: string) => {
  const v = String(val || "").trim()
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export default function NoteForm() {
  const { id } = useParams<{ id: string }>()
  const editingId = (id ?? "").trim()
  const isEditing = Boolean(editingId)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState<boolean>(!!isEditing)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [color, setColor] = useState("#94a3b8")
  const [isFavorite, setIsFavorite] = useState(false)
  const [remindAtLocal, setRemindAtLocal] = useState("")

  useEffect(() => {
    let alive = true
    const load = async () => {
      if (!isEditing) return
      setLoading(true)
      try {
        const resp = await fetchPersonalNote(editingId)
        if (!alive) return
        const n: PersonalNote = resp.data
        setTitle(htmlToPlainText(n.title || ""))
        setContent(htmlToPlainText(n.content || ""))
        setColor(n.color || "#94a3b8")
        setIsFavorite(Boolean(n.is_favorite))
        setRemindAtLocal(toLocalDateTimeInput(n.remind_at ?? null))
      } catch (e: any) {
        if (!alive) return
        toast({ title: "Erro", description: e?.message ?? "Falha ao carregar anotação", variant: "destructive" })
      } finally {
        if (!alive) return
        setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [isEditing, editingId, toast])

  const submit = async () => {
    const titleClean = String(title || "").trim()
    if (!titleClean) {
      toast({ title: "Validação", description: "Título é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: titleClean,
        content: htmlToPlainText(content ?? ""),
        color: (color || "").trim() ? color.trim() : null,
        is_favorite: Boolean(isFavorite),
        remind_at: fromLocalDateTimeInput(remindAtLocal),
      } as any

      if (isEditing) {
        await updatePersonalNote(editingId, payload)
        toast({ title: "Sucesso", description: "Anotação atualizada" })
      } else {
        await createPersonalNote({
          shared_with_user_ids: [],
          ...payload,
        })
        toast({ title: "Sucesso", description: "Anotação criada" })
      }

      navigate("/personal/notes")
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{isEditing ? "Editar Anotação" : "Nova Anotação"}</h1>
            <p className="page-subtitle">Pessoal → Minhas Anotações</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" disabled={saving}>
              <Link to="/personal/notes">Voltar</Link>
            </Button>
            <Button onClick={submit} disabled={saving || loading}>Guardar</Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="text-sm text-muted-foreground">A carregar…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Título</div>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Checklist do mês" />
            </div>

            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Conteúdo</div>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreve aqui…" />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Cor</div>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color || "#94a3b8"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-12 rounded-md border border-input bg-background p-1"
                  title="Escolher cor"
                />
                <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="#RRGGBB" />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div>
                <div className="text-sm font-medium">Favorita</div>
                <div className="text-xs text-muted-foreground">Controla is_favorite</div>
              </div>
              <Switch checked={isFavorite} onCheckedChange={(v) => setIsFavorite(Boolean(v))} />
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Lembrar em</div>
              <Input
                type="datetime-local"
                value={remindAtLocal}
                onChange={(e) => setRemindAtLocal(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}