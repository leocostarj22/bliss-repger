import { useEffect, useMemo, useRef, useState } from "react"
import type { ChangeEvent } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Image as ImageIcon, Loader2, Upload, X } from "lucide-react"

import type { AdminPost } from "@/types"
import { fetchAdminPosts, updateAdminPost } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import { handleImageUpload } from "@/lib/tiptap-utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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

export default function AdminPostEdit() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const postId = (id ?? "").toString()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [post, setPost] = useState<AdminPost | null>(null)

  const [titleDraft, setTitleDraft] = useState("")
  const [contentDraft, setContentDraft] = useState("")
  const [typeDraft, setTypeDraft] = useState<"announcement" | "text" | "image" | "video">("announcement")
  const [priorityDraft, setPriorityDraft] = useState<"normal" | "low" | "high" | "urgent">("normal")
  const [imageUrlDraft, setImageUrlDraft] = useState("")
  const [youtubeUrlDraft, setYoutubeUrlDraft] = useState("")
  const [attachmentUrlsDraft, setAttachmentUrlsDraft] = useState<string[]>([])
  const [newAttachmentUrlDraft, setNewAttachmentUrlDraft] = useState("")

  const [mediaDialogOpen, setMediaDialogOpen] = useState(false)
  const [mediaLoading, setMediaLoading] = useState(false)
  const [mediaItems, setMediaItems] = useState<{ filename: string; url: string }[]>([])
  const imageUploadInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)

  const canManage = Boolean(post?.can_manage)

  const title = useMemo(() => {
    const t = (post?.title ?? "").toString().trim()
    return t ? `Editar: ${t}` : "Editar post"
  }, [post?.title])

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
          url: String(it.url ?? ""),
        }))
      )
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar imagens", variant: "destructive" })
    } finally {
      setMediaLoading(false)
    }
  }

  const onOpenMediaDialog = () => {
    setMediaDialogOpen(true)
    if (!mediaItems.length) void loadMedia()
  }

  const onPickMedia = (url: string) => {
    if (!url) return
    setImageUrlDraft(url)
    setMediaDialogOpen(false)
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
      setImageUrlDraft(url)
      toast({ title: "Imagem enviada", description: "A capa foi atualizada." })
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
    if (!postId) {
      setLoading(false)
      setPost(null)
      return
    }

    setLoading(true)
    try {
      const resp = await fetchAdminPosts()
      const found = resp.data.find((p) => String(p.id) === String(postId)) ?? null
      setPost(found)

      if (found) {
        setTitleDraft((found.title ?? "").toString())
        setContentDraft((found.content ?? "").toString())
        setTypeDraft((found.type as any) || "announcement")
        setPriorityDraft((found.priority as any) || "normal")
        setImageUrlDraft((found.featured_image_url ?? "").toString())
        setYoutubeUrlDraft((found.youtube_video_url ?? "").toString())
        setAttachmentUrlsDraft(Array.isArray(found.attachment_urls) ? found.attachment_urls.map((u) => String(u)) : [])
        setNewAttachmentUrlDraft("")
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar o post", variant: "destructive" })
      setPost(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [postId])

  const onSave = async () => {
    if (!post) return
    if (!canManage) {
      toast({ title: "Permissão", description: "Só o autor pode editar este post.", variant: "destructive" })
      return
    }

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

    setSaving(true)
    try {
      const resp = await updateAdminPost(post.id, payload)
      toast({ title: "Sucesso", description: "Post atualizado" })
      navigate("/communication/posts")
      setPost(resp.data)
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível atualizar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">A carregar…</h1>
          <p className="page-subtitle">Posts Administrativos</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card">
          <div className="text-sm text-muted-foreground">A carregar post…</div>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">Post não encontrado</h1>
          <p className="page-subtitle">Posts Administrativos</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="flex gap-3 justify-between items-center p-6 glass-card">
          <div className="text-sm text-muted-foreground">O post {postId} não está disponível.</div>
          <Button variant="outline" onClick={() => navigate("/communication/posts")}>
            Voltar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
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
                  onClick={() => onPickMedia(m.url)}
                >
                  <div className="overflow-hidden aspect-video bg-muted">
                    <img src={m.url} alt={m.filename} className="object-cover w-full h-full" loading="lazy" />
                  </div>
                  <div className="px-2 py-1 text-[11px] truncate">{m.filename}</div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="page-header">
        <div className="flex gap-3 justify-between items-start">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Posts Administrativos</p>
            <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
          </div>
          <Button variant="outline" onClick={() => navigate("/communication/posts")}>
            <ArrowLeft className="mr-2 w-4 h-4" />
            Voltar
          </Button>
        </div>
      </div>

      {!canManage ? (
        <div className="p-6 glass-card">
          <div className="text-sm text-muted-foreground">Só o autor pode editar este post.</div>
        </div>
      ) : (
        <div className="p-6 space-y-4 glass-card">
          <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} placeholder="Título (opcional)" />

          <RichTextEditor value={contentDraft} onChange={setContentDraft} className="min-h-[220px]" />

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
                title="Enviar imagem do PC"
              >
                {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={onOpenMediaDialog} title="Escolher do servidor">
                <ImageIcon className="w-4 h-4" />
              </Button>
            </div>

            <Input value={youtubeUrlDraft} onChange={(e) => setYoutubeUrlDraft(e.target.value)} placeholder="YouTube (URL)" />
          </div>

          {imageUrlDraft.trim() ? (
            <div className="overflow-hidden rounded-md border border-border/60 bg-background/40">
              <div className="flex gap-2 justify-between items-center px-3 py-2">
                <div className="text-xs truncate text-muted-foreground">Capa</div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setImageUrlDraft("")}>
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

          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" size="sm" variant={typeDraft === "announcement" ? "secondary" : "outline"} onClick={() => setTypeDraft("announcement")}>
              Comunicado
            </Button>
            <Button type="button" size="sm" variant={typeDraft === "text" ? "secondary" : "outline"} onClick={() => setTypeDraft("text")}>
              Texto
            </Button>
            <Button type="button" size="sm" variant={typeDraft === "image" ? "secondary" : "outline"} onClick={() => setTypeDraft("image")}>
              Imagem
            </Button>
            <Button type="button" size="sm" variant={typeDraft === "video" ? "secondary" : "outline"} onClick={() => setTypeDraft("video")}>
              Vídeo
            </Button>

            <Button type="button" size="sm" variant={priorityDraft === "normal" ? "secondary" : "outline"} onClick={() => setPriorityDraft("normal")}>
              Normal
            </Button>
            <Button type="button" size="sm" variant={priorityDraft === "high" ? "secondary" : "outline"} onClick={() => setPriorityDraft("high")}>
              Alta
            </Button>
            <Button type="button" size="sm" variant={priorityDraft === "urgent" ? "destructive" : "outline"} onClick={() => setPriorityDraft("urgent")}>
              Urgente
            </Button>
          </div>

          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Anexos</div>
            <div className="flex gap-2 items-center">
              <Input
                value={newAttachmentUrlDraft}
                onChange={(e) => setNewAttachmentUrlDraft(e.target.value)}
                placeholder="Adicionar anexo (URL)"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const u = newAttachmentUrlDraft.trim()
                  if (!u) return
                  setAttachmentUrlsDraft((prev) => Array.from(new Set([...prev, u])))
                  setNewAttachmentUrlDraft("")
                }}
              >
                Adicionar
              </Button>
            </div>

            {!attachmentUrlsDraft.length ? (
              <div className="text-xs text-muted-foreground">Sem anexos.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attachmentUrlsDraft.map((url) => (
                  <div key={url} className="flex gap-2 items-center px-2 py-1 text-xs rounded-md border border-border/60 bg-background/40">
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

          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/communication/posts")} disabled={saving}>
              Cancelar
            </Button>
            <Button type="button" onClick={onSave} disabled={saving} className={cn(saving && "opacity-80")}>
              {saving ? <Loader2 className="mr-2 w-4 h-4 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}