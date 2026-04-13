import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Company, Department } from "@/types"
import { createDepartment, fetchCompanies, fetchDepartment, updateDepartment } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

type FormState = {
  name: string
  slug: string
  description: string
  color: string
  email: string
  company_id: string
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

export default function DepartmentForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [slugTouched, setSlugTouched] = useState(false)

  const [form, setForm] = useState<FormState>({
    name: "",
    slug: "",
    description: "",
    color: "#22d3ee",
    email: "",
    company_id: "",
    is_active: true,
  })

  const title = useMemo(() => (isEdit ? "Editar departamento" : "Novo departamento"), [isEdit])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const onNameChange = (value: string) => {
    setForm((prev) => {
      const next = { ...prev, name: value }
      if (!slugTouched) next.slug = slugify(value)
      return next
    })
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCompanies(), isEdit && id ? fetchDepartment(id) : Promise.resolve(null)])
      .then(([comps, depResp]) => {
        setCompanies(comps.data)

        if (depResp?.data) {
          const d = depResp.data
          setForm({
            name: d.name,
            slug: d.slug,
            description: d.description ?? "",
            color: d.color ?? "#22d3ee",
            email: d.email ?? "",
            company_id: d.company_id,
            is_active: Boolean(d.is_active),
          })
          setSlugTouched(true)
          return
        }

        setForm((prev) => ({
          ...prev,
          company_id: prev.company_id || comps.data[0]?.id || "",
        }))
      })
      .catch(() => {
        if (isEdit) {
          toast({ title: "Erro", description: "Departamento não encontrado", variant: "destructive" })
          navigate("/admin/departments", { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, toast])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.company_id) {
      toast({ title: "Erro", description: "Selecione uma empresa", variant: "destructive" })
      return
    }

    const nextSlug = form.slug.trim() || slugify(form.name)
    if (!nextSlug) {
      toast({ title: "Erro", description: "O slug é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        const r = await updateDepartment(id, {
          name: form.name.trim(),
          slug: nextSlug,
          description: form.description.trim() || null,
          color: form.color.trim() || null,
          email: form.email.trim() || null,
          company_id: form.company_id,
          is_active: form.is_active,
        })
        toast({ title: "Sucesso", description: "Departamento atualizado" })
        navigate(`/admin/departments/${r.data.id}`)
      } else {
        const r = await createDepartment({
          name: form.name.trim(),
          slug: nextSlug,
          description: form.description.trim() || null,
          color: form.color.trim() || null,
          email: form.email.trim() || null,
          company_id: form.company_id,
          is_active: form.is_active,
        } as Omit<Department, "id" | "createdAt" | "updatedAt">)
        toast({ title: "Sucesso", description: "Departamento criado" })
        navigate(`/admin/departments/${r.data.id}`)
      }
    } catch (e: any) {
      toast({ title: "Erro", description: String(e?.message ?? "Falha ao guardar"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Administração → Departamentos</p>
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
            <p className="page-subtitle">Administração → Departamentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/departments">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="department-form" disabled={saving || !form.name.trim() || !form.company_id}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="department-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa</label>
            <Select value={form.company_id} onValueChange={(v) => setField("company_id", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className={cn("text-xs text-muted-foreground", companies.length ? "block" : "hidden")}>
              O slug é único por empresa (igual ao comportamento do modelo Laravel).
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} placeholder="Nome do departamento" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Slug</label>
            <Input
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true)
                setField("slug", e.target.value)
              }}
              placeholder="slug-do-departamento"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@empresa.com" />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Descrição do departamento" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Cor</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color || "#94a3b8"}
                onChange={(e) => setField("color", e.target.value)}
                className="h-10 w-12 rounded-md border border-input bg-background p-1"
                title="Escolher cor"
              />
              <Input value={form.color} onChange={(e) => setField("color", e.target.value)} placeholder="#RRGGBB" />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Controla o campo is_active do modelo</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", Boolean(v))} />
          </div>
        </div>
      </form>
    </div>
  )
}