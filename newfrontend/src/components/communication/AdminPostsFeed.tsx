import { useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Heart, Loader2, MoreHorizontal, Pin, Trash2, Link as LinkIcon, Image as ImageIcon, Paperclip, Upload, X, Pencil } from "lucide-react"

import type { AdminPost } from "@/types"
import { createAdminPost, deleteAdminPost, fetchAdminPosts, toggleAdminPostLike, toggleAdminPostPin, updateAdminPost } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn, getInitials, resolvePhotoUrl } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { handleAttachmentUpload, handleImageUpload } from "@/lib/tiptap-utils"

type Props = {
  title?: string
  subtitle?: string
  className?: string
}


const fmtDateTime = (iso?: string | null) => {
  if (!iso) return ""
  try {
    return new Date(iso).toLocaleString("pt-PT")
  } catch {
    return String(iso)
  }
}

const normalizePostMediaUrl = (input?: string | null) => {
  const raw = String(input ?? "").trim()
  if (!raw) return ""

  if (raw.startsWith("/api/v1/communication/posts/images/view/")) return raw
  if (raw.startsWith("/storage/posts/images/")) {
    const filename = raw.split("/").pop() || ""
    return filename ? `/api/v1/communication/posts/images/view/${encodeURIComponent(filename)}` : raw
  }
  if (raw.startsWith("posts/images/")) {
    const filename = raw.split("/").pop() || ""
    return filename ? `/api/v1/communication/posts/images/view/${encodeURIComponent(filename)}` : raw
  }

  try {
    const u = new URL(raw)
    if (u.pathname.startsWith("/api/v1/communication/posts/images/view/")) {
      return `${u.pathname}${u.search}`
    }
    if (u.pathname.startsWith("/storage/posts/images/")) {
      const filename = u.pathname.split("/").pop() || ""
      return filename ? `/api/v1/communication/posts/images/view/${encodeURIComponent(filename)}` : raw
    }
  } catch {
    return raw
  }

  return raw
}

const normalizePostMediaHtml = (html: string) => {
  const raw = String(html ?? "")
  if (!raw) return ""

  return raw
    .replace(/https?:\/\/[^"'\s)]+\/api\/v1\/communication\/posts\/images\/view\/([^"'\s)]+)/gi, (_m, p1) => `/api/v1/communication/posts/images/view/${p1}`)
    .replace(/https?:\/\/[^"'\s)]+\/storage\/posts\/images\/([^"'\s)]+)/gi, (_m, p1) => `/api/v1/communication/posts/images/view/${encodeURIComponent(p1)}`)
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

  const normalizeTextColor = (value: string) => {
    const v = (value ?? "").trim().toLowerCase()
    if (!v) return null
    if (v === "black" || v === "#000" || v === "#000000") return "hsl(var(--foreground))"

    const hex = v.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    if (hex) {
      const h = hex[1].toLowerCase()
      const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h
      if (full === "000000") return "hsl(var(--foreground))"
      return null
    }

    const rgb = v.match(/^rgba?\((.+)\)$/i)
    if (rgb) {
      const parts = rgb[1].split(",").map((s) => s.trim())
      const r = Number.parseFloat(parts[0] ?? "")
      const g = Number.parseFloat(parts[1] ?? "")
      const b = Number.parseFloat(parts[2] ?? "")
      if (!Number.isFinite(r) || !Number.isFinite(g) || !Number.isFinite(b)) return null
      if (r <= 32 && g <= 32 && b <= 32) return "hsl(var(--foreground))"
      return null
    }

    return null
  }

  const normalizeInlineStyles = (style: string) => {
    const parts = (style ?? "")
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean)

    let changed = false
    const next = parts.map((decl) => {
      const idx = decl.indexOf(":")
      if (idx <= 0) return decl
      const prop = decl.slice(0, idx).trim().toLowerCase()
      const val = decl.slice(idx + 1).trim()
      if (prop !== "color") return decl
      const repl = normalizeTextColor(val)
      if (!repl) return decl
      changed = true
      return `color: ${repl}`
    })

    return changed ? next.join("; ") : style
  }

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

      const style = el.getAttribute("style")
      if (style) {
        const nextStyle = normalizeInlineStyles(style)
        if (nextStyle.trim()) el.setAttribute("style", nextStyle)
        else el.removeAttribute("style")
      }
    })

    return doc.body.innerHTML
  } catch {
    return raw
  }
}

const youtubeEmbedUrl = (raw?: string | null) => {
  const url = (raw ?? "").trim()
  if (!url) return null

  try {
    const u = new URL(url)
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.replace("/", "").trim()
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v")
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
  } catch {
    // ignore
  }

  return null
}

export default function AdminPostsFeed(props: Props) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)

  const [posts, setPosts] = useState<AdminPost[]>([])
  const [busyPostIds, setBusyPostIds] = useState<Record<string, boolean>>({})
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  const [titleDraft, setTitleDraft] = useState("")
  const [contentDraft, setContentDraft] = useState("")
  const [typeDraft, setTypeDraft] = useState<"announcement" | "text" | "image" | "video">("announcement")
  const [priorityDraft, setPriorityDraft] = useState<"normal" | "low" | "high" | "urgent">("normal")
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("")
  const [attachmentUrlsDraft, setAttachmentUrlsDraft] = useState<string[]>([])

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingPostId, setEditingPostId] = useState<string | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)

  const [editTitleDraft, setEditTitleDraft] = useState("")
  const [editContentDraft, setEditContentDraft] = useState("")
  const [editTypeDraft, setEditTypeDraft] = useState<"announcement" | "text" | "image" | "video">("announcement")
  const [editPriorityDraft, setEditPriorityDraft] = useState<"normal" | "low" | "high" | "urgent">("normal")
  const [editImageUrlDraft, setEditImageUrlDraft] = useState("")
  const [editYoutubeUrlDraft, setEditYoutubeUrlDraft] = useState("")
  const [editAttachmentUrlsDraft, setEditAttachmentUrlsDraft] = useState<string[]>([])
  const [editNewAttachmentUrlDraft, setEditNewAttachmentUrlDraft] = useState("")

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaItems, setMediaItems] = useState<{ filename: string; url: string }[]>([])
  const [mediaLoading, setMediaLoading] = useState(false)

  const [attachmentsDialogOpen, setAttachmentsDialogOpen] = useState(false)
  const [attachmentItems, setAttachmentItems] = useState<{ filename: string; url: string }[]>([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)

  const [imageUploading, setImageUploading] = useState(false)
  const imageUploadInputRef = useRef<HTMLInputElement>(null)

  const [attachmentsUploading, setAttachmentsUploading] = useState(false)
  const attachmentUploadInputRef = useRef<HTMLInputElement>(null)

  const loadMedia = async () => {
    setMediaLoading(true)
    try {
      const resp = await fetch("/api/v1/communication/posts/images/list", {
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      if (!resp.ok) throw new Error("Media list failed")
      const json = await resp.json()
      const data = Array.isArray(json?.data) ? json.data : []
      setMediaItems(
        data.map((it: any) => ({
          filename: String(it.filename ?? ""),
          url: normalizePostMediaUrl(String(it.url ?? "")),
        }))
      )
    } catch (e) {
      console.warn("Falha ao carregar mídia", e)
      toast({ title: "Erro", description: "Não foi possível carregar imagens", variant: "destructive" })
    } finally {
      setMediaLoading(false)
    }
  }

  const onOpenMediaDialog = () => {
    if (!mediaDialogOpen) {
      setMediaDialogOpen(true)
      if (!mediaItems.length) {
        void loadMedia()
      }
    }
  }

  const onPickMedia = (url: string) => {
    const normalized = normalizePostMediaUrl(url)
    if (!normalized) return
    if (!imageUrlDraft.trim()) {
      setImageUrlDraft(normalized)
    } else {
      setAttachmentUrlsDraft((prev) => Array.from(new Set([...prev, normalized])))
    }
  }

  const loadAttachments = async () => {
    setAttachmentsLoading(true)
    try {
      const resp = await fetch("/api/v1/posts/attachments/list", {
        headers: { Accept: "application/json" },
        credentials: "include",
      })
      if (!resp.ok) throw new Error("Attachment list failed")
      const json = await resp.json()
      const data = Array.isArray(json?.data) ? json.data : []
      setAttachmentItems(
        data.map((it: any) => ({
          filename: String(it.filename ?? ""),
          url: String(it.url ?? ""),
        }))
      )
    } catch (e) {
      console.warn("Falha ao carregar anexos", e)
      toast({ title: "Erro", description: "Não foi possível carregar anexos", variant: "destructive" })
    } finally {
      setAttachmentsLoading(false)
    }
  }

  const onOpenAttachmentsDialog = () => {
    if (!attachmentsDialogOpen) {
      setAttachmentsDialogOpen(true)
      if (!attachmentItems.length) {
        void loadAttachments()
      }
    }
  }

  const onPickAttachment = (url: string) => {
    if (!url) return
    setAttachmentUrlsDraft((prev) => Array.from(new Set([...prev, url])))
  }

  const onUploadAttachmentsFromComputer = () => {
    attachmentUploadInputRef.current?.click()
  }

  const onAttachmentsSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ""
    if (!files.length) return

    setAttachmentsUploading(true)
    try {
      for (const file of files) {
        const url = await handleAttachmentUpload(file)
        onPickAttachment(url)
      }
      toast({ title: "Anexos enviados", description: "Os anexos foram adicionados ao post." })
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível enviar os anexos.",
        variant: "destructive",
      })
    } finally {
      setAttachmentsUploading(false)
    }
  }

  const onUploadImageFromComputer = () => {
    imageUploadInputRef.current?.click()
  }

  const onImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    setImageUploading(true)
    try {
      const url = await handleImageUpload(file)
      onPickMedia(normalizePostMediaUrl(url))
      toast({ title: "Imagem enviada", description: "A imagem foi adicionada ao post." })
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err?.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      })
    } finally {
      setImageUploading(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const postsResp = await fetchAdminPosts()
      setPosts(postsResp.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar posts", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async () => {
    const content = contentDraft
    if (isRichTextEmpty(content)) {
      toast({ title: "Validação", description: "Escreve o conteúdo do post", variant: "destructive" })
      return
    }

    const payload = {
      title: titleDraft.trim() ? titleDraft.trim() : null,
      content,
      type: typeDraft,
      priority: priorityDraft,
      featured_image_url: imageUrlDraft.trim() ? imageUrlDraft.trim() : null,
      youtube_video_url: youtubeUrlDraft.trim() ? youtubeUrlDraft.trim() : null,
      attachment_urls: attachmentUrlsDraft.length ? attachmentUrlsDraft : null,
    }

    setPosting(true)
    try {
      const resp = await createAdminPost(payload)
      setPosts((prev) => [resp.data, ...prev])
      setTitleDraft("")
      setContentDraft("")
      setTypeDraft("announcement")
      setPriorityDraft("normal")
      setImageUrlDraft("")
      setYoutubeUrlDraft("")
      setAttachmentUrlsDraft([])
      toast({ title: "Sucesso", description: "Post publicado" })
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Não foi possível publicar"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setPosting(false)
    }
  }

  const onToggleLike = async (postId: string) => {
    setBusyPostIds((m) => ({ ...m, [postId]: true }))
    try {
      const resp = await toggleAdminPostLike(postId)
      setPosts((prev) => prev.map((p) => (p.id === postId ? resp.data : p)))
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar o like", variant: "destructive" })
    } finally {
      setBusyPostIds((m) => ({ ...m, [postId]: false }))
    }
  }

  const onTogglePin = async (postId: string) => {
    setBusyPostIds((m) => ({ ...m, [postId]: true }))
    try {
      const resp = await toggleAdminPostPin(postId)
      setPosts((prev) => prev.map((p) => (p.id === postId ? resp.data : p)))
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Não foi possível fixar"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setBusyPostIds((m) => ({ ...m, [postId]: false }))
    }
  }

  const onDelete = async (postId: string) => {
    setBusyPostIds((m) => ({ ...m, [postId]: true }))
    try {
      await deleteAdminPost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      toast({ title: "Sucesso", description: "Post removido" })
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Não foi possível remover"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setBusyPostIds((m) => ({ ...m, [postId]: false }))
    }
  }

  const onOpenEdit = (p: AdminPost) => {
    setEditingPostId(p.id)
    setEditTitleDraft((p.title ?? "").toString())
    setEditContentDraft((p.content ?? "").toString())
    setEditTypeDraft((p.type as any) || "announcement")
    setEditPriorityDraft((p.priority as any) || "normal")
    setEditImageUrlDraft((p.featured_image_url ?? "").toString())
    setEditYoutubeUrlDraft((p.youtube_video_url ?? "").toString())
    setEditAttachmentUrlsDraft(Array.isArray(p.attachment_urls) ? p.attachment_urls.map((u) => String(u)) : [])
    setEditNewAttachmentUrlDraft("")
    setEditDialogOpen(true)
  }

  const onSaveEdit = async () => {
    if (!editingPostId) return

    const content = editContentDraft
    if (isRichTextEmpty(content)) {
      toast({ title: "Validação", description: "Escreve o conteúdo do post", variant: "destructive" })
      return
    }

    const payload = {
      title: editTitleDraft.trim() ? editTitleDraft.trim() : null,
      content,
      type: editTypeDraft,
      priority: editPriorityDraft,
      featured_image_url: editImageUrlDraft.trim() ? editImageUrlDraft.trim() : null,
      youtube_video_url: editYoutubeUrlDraft.trim() ? editYoutubeUrlDraft.trim() : null,
      attachment_urls: editAttachmentUrlsDraft.length ? editAttachmentUrlsDraft : null,
    }

    setSavingEdit(true)
    try {
      const resp = await updateAdminPost(editingPostId, payload)
      setPosts((prev) => prev.map((p) => (p.id === editingPostId ? resp.data : p)))
      setEditDialogOpen(false)
      toast({ title: "Sucesso", description: "Post atualizado" })
    } catch (e: any) {
      const msg = e?.message ? String(e.message) : "Não foi possível atualizar"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSavingEdit(false)
    }
  }

  const onCopyLink = async (postId: string) => {
    const url = `${window.location.origin}${window.location.pathname}#post-${postId}`
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const el = document.createElement("textarea")
        el.value = url
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
      }
      toast({ title: "Copiado", description: "Link do post copiado" })
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar", variant: "destructive" })
    }
  }

  const title = props.title ?? "Posts Administrativos"
  const subtitle = props.subtitle ?? "Feed interno"

  const priorityBadge = useMemo(() => {
    return (p: AdminPost) => {
      const pr = (p.priority ?? "").toString()
      if (pr === "urgent") return <Badge variant="destructive">Urgente</Badge>
      if (pr === "high") return <Badge variant="secondary">Alta</Badge>
      if (pr === "low") return <Badge variant="outline">Baixa</Badge>
      return null
    }
  }, [])

  return (
    <div className={cn("glass-card p-6", props.className)}>
      <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Biblioteca de imagens</DialogTitle>
            <DialogDescription>Escolhe uma imagem já enviada para o servidor.</DialogDescription>
          </DialogHeader>

          

          {mediaLoading ? (
            <div className="text-sm text-muted-foreground">A carregar imagens…</div>
          ) : !mediaItems.length ? (
            <div className="text-sm text-muted-foreground">Sem imagens disponíveis.</div>
          ) : (
            <div className="grid overflow-auto grid-cols-2 gap-3 max-h-80 md:grid-cols-3">
              {mediaItems.map((m) => (
                <button
                  key={m.filename}
                  type="button"
                  className="flex overflow-hidden flex-col items-stretch text-left rounded-md border border-border/60 bg-background/40 hover:bg-secondary/40"
                  onClick={() => {
                    onPickMedia(m.url)
                    setMediaDialogOpen(false)
                  }}
                >
                  <div className="overflow-hidden aspect-video bg-muted">
                    <img src={m.url} alt={m.filename} className="object-cover w-full h-full" loading="lazy" />
                  </div>
                  <div className="px-2 py-1 text-[11px] truncate flex items-center gap-1">
                    <Paperclip className="w-3 h-3" />
                    {m.filename}
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>

        {/* Trigger é o botão de imagem ao lado dos anexos */}
      </Dialog>

      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open)
          if (!open) setEditingPostId(null)
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar post</DialogTitle>
            <DialogDescription>Atualiza o conteúdo e a mídia do post.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input value={editTitleDraft} onChange={(e) => setEditTitleDraft(e.target.value)} placeholder="Título (opcional)" />
            <RichTextEditor value={editContentDraft} onChange={setEditContentDraft} className="min-h-[160px]" />

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Input value={editImageUrlDraft} onChange={(e) => setEditImageUrlDraft(e.target.value)} placeholder="Capa (URL)" />
              <Input value={editYoutubeUrlDraft} onChange={(e) => setEditYoutubeUrlDraft(e.target.value)} placeholder="YouTube (URL)" />
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Button
                type="button"
                size="sm"
                variant={editTypeDraft === "announcement" ? "secondary" : "outline"}
                onClick={() => setEditTypeDraft("announcement")}
              >
                Comunicado
              </Button>
              <Button type="button" size="sm" variant={editTypeDraft === "text" ? "secondary" : "outline"} onClick={() => setEditTypeDraft("text")}>
                Texto
              </Button>
              <Button type="button" size="sm" variant={editTypeDraft === "image" ? "secondary" : "outline"} onClick={() => setEditTypeDraft("image")}>
                Imagem
              </Button>
              <Button type="button" size="sm" variant={editTypeDraft === "video" ? "secondary" : "outline"} onClick={() => setEditTypeDraft("video")}>
                Vídeo
              </Button>

              <Button type="button" size="sm" variant={editPriorityDraft === "normal" ? "secondary" : "outline"} onClick={() => setEditPriorityDraft("normal")}>
                Normal
              </Button>
              <Button type="button" size="sm" variant={editPriorityDraft === "high" ? "secondary" : "outline"} onClick={() => setEditPriorityDraft("high")}>
                Alta
              </Button>
              <Button type="button" size="sm" variant={editPriorityDraft === "urgent" ? "destructive" : "outline"} onClick={() => setEditPriorityDraft("urgent")}>
                Urgente
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Anexos</div>

              <div className="flex gap-2 items-center">
                <Input
                  value={editNewAttachmentUrlDraft}
                  onChange={(e) => setEditNewAttachmentUrlDraft(e.target.value)}
                  placeholder="Adicionar anexo (URL)"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const u = editNewAttachmentUrlDraft.trim()
                    if (!u) return
                    setEditAttachmentUrlsDraft((prev) => Array.from(new Set([...prev, u])))
                    setEditNewAttachmentUrlDraft("")
                  }}
                >
                  Adicionar
                </Button>
              </div>

              {!editAttachmentUrlsDraft.length ? (
                <div className="text-xs text-muted-foreground">Sem anexos.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {editAttachmentUrlsDraft.map((url) => (
                    <div
                      key={url}
                      className="flex gap-2 items-center px-2 py-1 text-xs rounded-md border border-border/60 bg-background/40"
                    >
                      <a href={url} target="_blank" rel="noreferrer" className="hover:underline max-w-[320px] truncate">
                        {url.split("/").pop()}
                      </a>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => setEditAttachmentUrlsDraft((prev) => prev.filter((u) => u !== url))}
                        aria-label="Remover anexo"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} disabled={savingEdit}>
                Cancelar
              </Button>
              <Button type="button" onClick={onSaveEdit} disabled={savingEdit}>
                {savingEdit ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex gap-4 justify-between items-start mb-5">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          Atualizar
        </Button>
      </div>

      <div className="mb-6 space-y-3">
        <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Título (opcional)" />
        <RichTextEditor
          value={contentDraft}
          onChange={setContentDraft}
          placeholder="Escreve um comunicado para toda a equipa…"
          className="min-h-[160px]"
        />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          <div className="flex gap-2 items-center">
            <Input
              value={imageUrlDraft}
              onChange={(e) => setImageUrlDraft(e.target.value)}
              placeholder="Capa (URL)"
              className="flex-1"
            />
            <input
              ref={imageUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onUploadImageFromComputer}
              disabled={imageUploading}
            >
              {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            </Button>
            <Button type="button" variant="outline" size="icon" onClick={onOpenMediaDialog}>
              <ImageIcon className="w-4 h-4" />
            </Button>
          </div>

          <Input value={youtubeUrlDraft} onChange={(e) => setYoutubeUrlDraft(e.target.value)} placeholder="YouTube (URL)" />
        </div>

        {imageUrlDraft.trim() ? (
          <div className="overflow-hidden rounded-md border border-border/60 bg-background/40">
            <div className="flex gap-2 justify-between items-center px-3 py-2">
              <div className="text-xs truncate text-muted-foreground">Capa</div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setImageUrlDraft("")}
              >
                Remover
              </Button>
            </div>
            <div className="aspect-video bg-muted">
              <img
                src={imageUrlDraft}
                alt="Capa"
                className="object-cover w-full h-full"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <div className="flex gap-2 justify-between items-center">
            <div className="text-sm text-muted-foreground">Anexos</div>
            <div className="flex gap-2 items-center">
              <input
                ref={attachmentUploadInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={onAttachmentsSelected}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onUploadAttachmentsFromComputer}
                disabled={attachmentsUploading}
                title="Enviar anexos"
              >
                {attachmentsUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={onOpenAttachmentsDialog}
                title="Escolher anexos do servidor"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {!attachmentUrlsDraft.length ? (
            <div className="text-xs text-muted-foreground">Sem anexos.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attachmentUrlsDraft.map((url) => (
                <div
                  key={url}
                  className="flex gap-2 items-center px-2 py-1 text-xs rounded-md border border-border/60 bg-background/40"
                >
                  <a href={url} target="_blank" rel="noreferrer" className="hover:underline max-w-[320px] truncate">
                    {url.split("/").pop()}
                  </a>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setAttachmentUrlsDraft((prev) => prev.filter((u) => u !== url))}
                    aria-label="Remover anexo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>



        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex flex-wrap gap-2 items-center">
            <Button
              type="button"
              size="sm"
              variant={typeDraft === "announcement" ? "secondary" : "outline"}
              onClick={() => setTypeDraft("announcement")}
            >
              Comunicado
            </Button>
            <Button
              type="button"
              size="sm"
              variant={typeDraft === "text" ? "secondary" : "outline"}
              onClick={() => setTypeDraft("text")}
            >
              Texto
            </Button>
            <Button
              type="button"
              size="sm"
              variant={typeDraft === "image" ? "secondary" : "outline"}
              onClick={() => setTypeDraft("image")}
            >
              Imagem
            </Button>
            <Button
              type="button"
              size="sm"
              variant={typeDraft === "video" ? "secondary" : "outline"}
              onClick={() => setTypeDraft("video")}
            >
              Vídeo
            </Button>

            <Button
              type="button"
              size="sm"
              variant={priorityDraft === "normal" ? "secondary" : "outline"}
              onClick={() => setPriorityDraft("normal")}
            >
              Normal
            </Button>
            <Button
              type="button"
              size="sm"
              variant={priorityDraft === "high" ? "secondary" : "outline"}
              onClick={() => setPriorityDraft("high")}
            >
              Alta
            </Button>
            <Button
              type="button"
              size="sm"
              variant={priorityDraft === "urgent" ? "destructive" : "outline"}
              onClick={() => setPriorityDraft("urgent")}
            >
              Urgente
            </Button>
          </div>

          <Button onClick={onCreate} disabled={posting || loading}>
            {posting ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
            Publicar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">A carregar…</div>
      ) : posts.length === 0 ? (
        <div className="text-sm text-muted-foreground">Sem posts.</div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => {
            const busy = !!busyPostIds[p.id]
            const embed = youtubeEmbedUrl(p.youtube_video_url)
            const when = p.published_at ?? p.created_at ?? null
            const expanded = !!expandedIds[p.id]
            const fullHtml = (p.content ?? "").toString()
            const safeHtml = normalizePostMediaHtml(sanitizeHtml(fullHtml))
            const text = plainTextFromHtml(fullHtml)
            const tooLong = text.length > 420

            return (
              <div key={p.id} id={`post-${p.id}`} className="p-4 rounded-lg border border-border/60 bg-background/40">
                <div className="flex gap-3 justify-between items-start">
                  <div className="flex gap-3 items-start min-w-0">
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={resolvePhotoUrl(p.author?.photo_path ?? null) ?? undefined} alt={p.author?.name ?? undefined} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {getInitials(p.author?.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex gap-2 items-center min-w-0">
                        <div className="text-sm font-medium truncate">{p.author?.name ?? "Sistema"}</div>
                        {p.is_pinned ? <Badge variant="secondary">Fixado</Badge> : null}
                        {priorityBadge(p)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {(p.title ?? "").trim() ? <span className="font-medium">{p.title}</span> : null}
                        {(p.title ?? "").trim() && when ? <span> • </span> : null}
                        {when ? fmtDateTime(when) : null}
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" disabled={busy}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onCopyLink(p.id)}>
                        <LinkIcon className="mr-2 w-4 h-4" />
                        Copiar link
                      </DropdownMenuItem>
                      {p.can_pin ? (
                        <DropdownMenuItem onClick={() => onTogglePin(p.id)}>
                          <Pin className="mr-2 w-4 h-4" />
                          {p.is_pinned ? "Desafixar" : "Fixar"}
                        </DropdownMenuItem>
                      ) : null}
                      {p.can_manage ? (
                        <DropdownMenuItem onClick={() => navigate(`/communication/posts/${encodeURIComponent(p.id)}/edit`)}>
                          <Pencil className="mr-2 w-4 h-4" />
                          Editar
                        </DropdownMenuItem>
                      ) : null}
                      {p.can_manage ? (
                        <DropdownMenuItem onClick={() => onDelete(p.id)} className="text-destructive">
                          <Trash2 className="mr-2 w-4 h-4" />
                          Apagar
                        </DropdownMenuItem>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {safeHtml ? (
                  <div
                    className={cn(
                      "mt-3 text-sm tiptap ProseMirror min-h-0 p-0",
                      !expanded && tooLong && "max-h-40 overflow-hidden"
                    )}
                    dangerouslySetInnerHTML={{ __html: safeHtml }}
                  />
                ) : null}
                {tooLong ? (
                  <button
                    className="mt-2 text-xs text-primary hover:underline"
                    onClick={() => setExpandedIds((m) => ({ ...m, [p.id]: !expanded }))}
                  >
                    {expanded ? "Ver menos" : "Ver mais"}
                  </button>
                ) : null}

                {normalizePostMediaUrl(p.featured_image_url) ? (
                  <div className="overflow-hidden mt-4 rounded-md border border-border/60">
                    <img
                      src={normalizePostMediaUrl(p.featured_image_url)}
                      alt={p.title ?? "Imagem"}
                      className="w-full max-h-[420px] object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : null}

                {embed ? (
                  <div className="overflow-hidden mt-4 rounded-md border border-border/60 aspect-video">
                    <iframe
                      src={embed}
                      title={p.title ?? "YouTube"}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      referrerPolicy="no-referrer"
                      allowFullScreen
                    />
                  </div>
                ) : null}

                {Array.isArray(p.attachment_urls) && p.attachment_urls.length ? (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {p.attachment_urls.map((u) => (
                      <a
                        key={u}
                        href={normalizePostMediaUrl(u) || u}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 text-xs rounded-md border border-border/60 bg-background/50 hover:bg-secondary/50"
                      >
                        {u}
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="flex gap-2 items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => onToggleLike(p.id)}
                    className={cn(p.liked_by_me && "border-rose-500/40 text-rose-600")}
                  >
                    <Heart className={cn("w-4 h-4 mr-2", p.liked_by_me && "fill-rose-500 text-rose-500")} />
                    {p.likes_count}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}