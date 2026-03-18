import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, X } from "lucide-react"

import type { Company } from "@/types"
import { createCompany, fetchCompany, updateCompany } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  name: string
  slug: string
  email: string
  phone: string
  address: string
  logo: string
  logoFileName: string
  settingsText: string
  is_active: boolean
}

const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")

export default function CompanyForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)
  const [logoInputKey, setLogoInputKey] = useState(0)
  const [replaceLogoOpen, setReplaceLogoOpen] = useState(false)
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    logo: "",
    logoFileName: "",
    settingsText: "",
    is_active: true,
  })

  const title = useMemo(() => (isEdit ? "Editar empresa" : "Nova empresa"), [isEdit])

  useEffect(() => {
    if (!id) return

    setLoading(true)
    fetchCompany(id)
      .then((r) => {
        const c = r.data
        setForm({
          name: c.name,
          slug: c.slug,
          email: c.email ?? "",
          phone: c.phone ?? "",
          address: c.address ?? "",
          logo: c.logo ?? "",
          logoFileName: typeof (c.settings as any)?.logoFileName === "string" ? (c.settings as any).logoFileName : "",
          settingsText: c.settings ? JSON.stringify(c.settings, null, 2) : "",
          is_active: Boolean(c.is_active),
        })
        setSlugTouched(true)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Empresa não encontrada", variant: "destructive" })
        navigate("/admin/companies", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const processLogoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Erro", description: "Selecione um ficheiro de imagem.", variant: "destructive" })
        setLogoInputKey((k) => k + 1)
        return
      }

      const maxBytes = 2 * 1024 * 1024
      if (file.size > maxBytes) {
        toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" })
        setLogoInputKey((k) => k + 1)
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          setField("logo", result)
          setField("logoFileName", file.name)
          setLogoInputKey((k) => k + 1)
          return
        }
        toast({ title: "Erro", description: "Não foi possível ler a imagem.", variant: "destructive" })
        setLogoInputKey((k) => k + 1)
      }

      reader.onerror = () => {
        toast({ title: "Erro", description: "Falha ao ler a imagem.", variant: "destructive" })
        setLogoInputKey((k) => k + 1)
      }

      reader.readAsDataURL(file)
    },
    [setField, toast]
  )

  const handleLogoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (form.logo.trim()) {
        setPendingLogoFile(file)
        setReplaceLogoOpen(true)
        return
      }

      processLogoFile(file)
    },
    [form.logo, processLogoFile]
  )

  const onNameChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, name: value }
      if (!slugTouched) next.slug = slugify(value)
      return next
    })
  }

  const parseSettings = (): Record<string, any> | undefined => {
    const raw = form.settingsText.trim()
    if (!raw) return {}
    try {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === "object") return parsed
      return {}
    } catch {
      return undefined
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const settings = parseSettings()
    if (settings === undefined) {
      toast({ title: "Erro", description: "Settings precisa ser JSON válido", variant: "destructive" })
      return
    }

    const settingsForSave: Record<string, any> = { ...settings }
    delete settingsForSave.logoFileName
    if (form.logo.trim().startsWith("data:") && form.logoFileName.trim()) {
      settingsForSave.logoFileName = form.logoFileName.trim()
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        const r = await updateCompany(id, {
          name: form.name.trim(),
          slug: form.slug.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          logo: form.logo.trim() || null,
          settings: settingsForSave,
          is_active: form.is_active,
        })
        toast({ title: "Sucesso", description: "Empresa atualizada" })
        navigate(`/admin/companies/${r.data.id}`)
      } else {
        const r = await createCompany({
          name: form.name.trim(),
          slug: form.slug.trim(),
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
          logo: form.logo.trim() || null,
          settings: settingsForSave,
          is_active: form.is_active,
        } as Omit<Company, "id" | "createdAt" | "updatedAt">)
        toast({ title: "Sucesso", description: "Empresa criada" })
        navigate(`/admin/companies/${r.data.id}`)
      }
    } catch {
      toast({ title: "Erro", description: "Falha ao guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Administração → Empresas</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Administração → Empresas</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/companies">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="company-form" disabled={saving || !form.name.trim()}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="company-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Nome da empresa" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setField("slug", e.target.value)
              }}
              placeholder="slug-da-empresa"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@empresa.com" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+351 ..." />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Morada</label>
            <Textarea value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Morada completa" />
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Logo</label>
              {form.logo.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setField("logo", "")
                    setField("logoFileName", "")
                    setLogoInputKey((k) => k + 1)
                  }}
                >
                  <X />
                  Remover
                </Button>
              )}
            </div>

            {form.logo.trim() && (
              <div className="flex items-center gap-4 rounded-lg border border-border p-4 bg-background/40">
                <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                  <img src={form.logo} alt="Logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">Pré-visualização</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {form.logo.startsWith("data:")
                      ? form.logoFileName.trim()
                        ? form.logoFileName
                        : "Imagem carregada do computador"
                      : form.logo}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Enviar do computador</div>
                <Input
                  key={logoInputKey}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="cursor-pointer"
                />
                <div className="text-xs text-muted-foreground">Guarda localmente (sem upload para o servidor).</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Ou URL/caminho</div>
                <Input
                  value={form.logo.trim().startsWith("data:") ? "" : form.logo}
                  onChange={(e) => {
                    setField("logo", e.target.value)
                    setField("logoFileName", "")
                  }}
                  placeholder="https://... ou /storage/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Settings (JSON)</label>
            <Textarea
              value={form.settingsText}
              onChange={(e) => setField("settingsText", e.target.value)}
              placeholder='{"locale":"pt-PT"}'
              className="font-mono text-xs min-h-[140px]"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Ativa</div>
              <div className="text-xs text-muted-foreground">Controla o campo is_active do modelo</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", Boolean(v))} />
          </div>
        </div>
      </form>

      {replaceLogoOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setReplaceLogoOpen(false)
            setPendingLogoFile(null)
            setLogoInputKey((k) => k + 1)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Substituir logo?</div>
              <div className="text-sm text-muted-foreground">Já existe uma logo definida. Deseja substituir?</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReplaceLogoOpen(false)
                  setPendingLogoFile(null)
                  setLogoInputKey((k) => k + 1)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const file = pendingLogoFile
                  setReplaceLogoOpen(false)
                  setPendingLogoFile(null)
                  if (file) processLogoFile(file)
                  else setLogoInputKey((k) => k + 1)
                }}
              >
                Substituir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}