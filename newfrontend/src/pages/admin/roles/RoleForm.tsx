import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Role } from "@/types"
import { createRole, fetchRole, updateRole } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  name: string
  display_name: string
  description: string
  permissionsText: string
  is_active: boolean
}

const parsePermissions = (value: string) => {
  const raw = value
    .split(/[\n,]+/g)
    .map((s) => s.trim())
    .filter(Boolean)

  const uniq: string[] = []
  raw.forEach((p) => {
    if (!uniq.includes(p)) uniq.push(p)
  })
  return uniq
}

export default function RoleForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState<FormState>({
    name: "",
    display_name: "",
    description: "",
    permissionsText: "",
    is_active: true,
  })

  const title = useMemo(() => (isEdit ? "Editar cargo" : "Novo cargo"), [isEdit])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    if (!isEdit || !id) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchRole(id)
      .then((r) => {
        const it = r.data
        setForm({
          name: it.name ?? "",
          display_name: it.display_name ?? "",
          description: it.description ?? "",
          permissionsText: (it.permissions ?? []).join("\n"),
          is_active: Boolean(it.is_active),
        })
      })
      .catch(() => {
        toast({ title: "Erro", description: "Cargo não encontrado", variant: "destructive" })
        navigate("/admin/roles", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, toast])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const name = form.name.trim()
    if (!name) {
      toast({ title: "Erro", description: "O nome é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload: Omit<Role, "id" | "createdAt" | "updatedAt"> = {
        name,
        display_name: form.display_name.trim() || null,
        description: form.description.trim() || null,
        permissions: parsePermissions(form.permissionsText),
        is_active: form.is_active,
      }

      if (isEdit && id) {
        const r = await updateRole(id, payload)
        toast({ title: "Sucesso", description: "Cargo atualizado" })
        navigate(`/admin/roles/${r.data.id}`)
      } else {
        const r = await createRole(payload)
        toast({ title: "Sucesso", description: "Cargo criado" })
        navigate(`/admin/roles/${r.data.id}`)
      }
    } catch (err: any) {
      const msg = typeof err?.message === "string" ? err.message : "Falha ao guardar"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Administração → Cargos</p>
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
            <p className="page-subtitle">Administração → Cargos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/roles">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="role-form" disabled={saving || !form.name.trim()}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="role-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome (interno)</label>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="admin / manager / agent ..." />
            <div className="text-xs text-muted-foreground">Equivalente ao campo name no Role.php</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display name</label>
            <Input value={form.display_name} onChange={(e) => setField("display_name", e.target.value)} placeholder="Administrador / Gestor ..." />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Descrição</label>
            <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} placeholder="Descrição do cargo" />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Permissões</label>
            <Textarea
              value={form.permissionsText}
              onChange={(e) => setField("permissionsText", e.target.value)}
              placeholder={"Uma por linha (ou separadas por vírgula)\nusers.read\nusers.write\n*"}
              className="min-h-[140px]"
            />
            <div className="text-xs text-muted-foreground">Guarda em permissions (array) como no cast do Laravel.</div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Controla o campo is_active</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", Boolean(v) as any)} />
          </div>
        </div>
      </form>
    </div>
  )
}