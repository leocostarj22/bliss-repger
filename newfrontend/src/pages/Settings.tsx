import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, Save, Settings as SettingsIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { fetchBranding, updateAdminBranding } from "@/services/api"

type FormState = {
  app_name: string
  app_title: string
  app_favicon: string
  app_favicon_file_name: string

  crm_name: string
  crm_title: string
  crm_favicon: string
  crm_favicon_file_name: string
}

const applyHeadBranding = (input: { title?: string | null; favicon_url?: string | null }) => {
  if (typeof document === "undefined") return

  const title = String(input?.title ?? "").trim()
  if (title) document.title = title

  const url = String(input?.favicon_url ?? "").trim()
  if (!url) return

  const href = `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`
  const links = Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']"))

  if (links.length === 0) {
    const link = document.createElement("link")
    link.rel = "icon"
    link.type = "image/png"
    link.href = href
    document.head.appendChild(link)
    return
  }

  for (const link of links) {
    link.href = href
    if (!link.type) link.type = "image/png"
  }
}

export default function SettingsPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [appFaviconKey, setAppFaviconKey] = useState(0)
  const [crmFaviconKey, setCrmFaviconKey] = useState(0)

  const [form, setForm] = useState<FormState>({
    app_name: "",
    app_title: "",
    app_favicon: "",
    app_favicon_file_name: "",
    crm_name: "",
    crm_title: "",
    crm_favicon: "",
    crm_favicon_file_name: "",
  })

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    let alive = true
    setLoading(true)

    fetchBranding()
      .then((r) => {
        if (!alive) return
        const app = r.data?.app
        const crm = r.data?.crm

        setForm({
          app_name: String(app?.name ?? "").trim(),
          app_title: String(app?.title ?? "").trim(),
          app_favicon: String(app?.favicon_url ?? "").trim(),
          app_favicon_file_name: "",
          crm_name: String(crm?.name ?? "").trim(),
          crm_title: String(crm?.title ?? "").trim(),
          crm_favicon: String(crm?.favicon_url ?? "").trim(),
          crm_favicon_file_name: "",
        })
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar configurações", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [toast])

  const processFaviconFile = useCallback(
    (file: File, target: "app" | "crm") => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Erro", description: "Selecione um ficheiro de imagem.", variant: "destructive" })
        if (target === "app") setAppFaviconKey((k) => k + 1)
        else setCrmFaviconKey((k) => k + 1)
        return
      }

      const maxBytes = 512 * 1024
      if (file.size > maxBytes) {
        toast({ title: "Erro", description: "O favicon deve ter no máximo 512KB.", variant: "destructive" })
        if (target === "app") setAppFaviconKey((k) => k + 1)
        else setCrmFaviconKey((k) => k + 1)
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          if (target === "app") {
            setField("app_favicon", result)
            setField("app_favicon_file_name", file.name)
            setAppFaviconKey((k) => k + 1)
          } else {
            setField("crm_favicon", result)
            setField("crm_favicon_file_name", file.name)
            setCrmFaviconKey((k) => k + 1)
          }
          return
        }

        toast({ title: "Erro", description: "Não foi possível ler a imagem.", variant: "destructive" })
        if (target === "app") setAppFaviconKey((k) => k + 1)
        else setCrmFaviconKey((k) => k + 1)
      }

      reader.onerror = () => {
        toast({ title: "Erro", description: "Falha ao ler a imagem.", variant: "destructive" })
        if (target === "app") setAppFaviconKey((k) => k + 1)
        else setCrmFaviconKey((k) => k + 1)
      }

      reader.readAsDataURL(file)
    },
    [setField, toast],
  )

  const canSave = useMemo(() => {
    return Boolean(form.app_name.trim() && form.app_title.trim() && form.crm_name.trim() && form.crm_title.trim())
  }, [form.app_name, form.app_title, form.crm_name, form.crm_title])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSave) return

    const appFavicon = form.app_favicon.trim()
    const crmFavicon = form.crm_favicon.trim()

    setSaving(true)
    try {
      const r = await updateAdminBranding({
        app_name: form.app_name.trim(),
        app_title: form.app_title.trim(),
        app_favicon: appFavicon || null,
        ...(appFavicon.startsWith("data:") && form.app_favicon_file_name.trim()
          ? { app_favicon_file_name: form.app_favicon_file_name.trim() }
          : {}),
        crm_name: form.crm_name.trim(),
        crm_title: form.crm_title.trim(),
        crm_favicon: crmFavicon || null,
        ...(crmFavicon.startsWith("data:") && form.crm_favicon_file_name.trim()
          ? { crm_favicon_file_name: form.crm_favicon_file_name.trim() }
          : {}),
      })

      toast({ title: "Sucesso", description: "Configurações atualizadas" })

      try {
        window.localStorage.setItem("nexterp:branding", JSON.stringify(r.data))
        window.dispatchEvent(new Event("nexterp:branding:updated"))
      } catch {
        // ignore
      }

      applyHeadBranding(r.data?.app)

      setForm((prev) => ({
        ...prev,
        app_favicon: String(r.data?.app?.favicon_url ?? prev.app_favicon),
        crm_favicon: String(r.data?.crm?.favicon_url ?? prev.crm_favicon),
        app_favicon_file_name: "",
        crm_favicon_file_name: "",
      }))
    } catch (e: any) {
      toast({
        title: "Erro",
        description: typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao guardar",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Administração → Configurações</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Configurações</h1>
            <p className="page-subtitle">Administração → Configurações</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="admin-settings" disabled={saving || !canSave}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="admin-settings" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400/15 to-fuchsia-500/15 border border-primary/20 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-semibold">Branding</div>
            <div className="text-sm text-muted-foreground">Nome do sistema, título e favicon (inclui CRM)</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="font-semibold">Sistema</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do sistema</label>
              <Input value={form.app_name} onChange={(e) => setField("app_name", e.target.value)} placeholder="Ex.: NextERP" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título (aba do navegador)</label>
              <Input value={form.app_title} onChange={(e) => setField("app_title", e.target.value)} placeholder="Ex.: NextERP" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Favicon</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                  {form.app_favicon.trim() ? (
                    <img src={form.app_favicon} alt={form.app_name || "Favicon"} className="w-6 h-6 object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
                <Input
                  key={appFaviconKey}
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    processFaviconFile(file, "app")
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">Recomendado: PNG quadrado (32×32 ou 64×64).</div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 space-y-4">
            <div className="font-semibold">CRM</div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do sistema</label>
              <Input value={form.crm_name} onChange={(e) => setField("crm_name", e.target.value)} placeholder="Ex.: NextCRM" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título (aba do navegador)</label>
              <Input value={form.crm_title} onChange={(e) => setField("crm_title", e.target.value)} placeholder="Ex.: NextCRM" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Favicon</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg border border-border bg-muted/20 flex items-center justify-center overflow-hidden">
                  {form.crm_favicon.trim() ? (
                    <img src={form.crm_favicon} alt={form.crm_name || "Favicon"} className="w-6 h-6 object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">—</div>
                  )}
                </div>
                <Input
                  key={crmFaviconKey}
                  type="file"
                  accept="image/png,image/x-icon,image/vnd.microsoft.icon,image/svg+xml,image/webp,image/jpeg"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    processFaviconFile(file, "crm")
                  }}
                />
              </div>
              <div className="text-xs text-muted-foreground">Recomendado: PNG quadrado (32×32 ou 64×64).</div>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
