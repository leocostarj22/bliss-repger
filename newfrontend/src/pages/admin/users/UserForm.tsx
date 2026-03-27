import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save, X } from "lucide-react"

const CLEAR_SELECT_VALUE = "__clear__"

import type { Company, Department, Role, User, WorkSchedule, WorkScheduleDay } from "@/types"
import { createUser, fetchAdminUser, fetchCompanies, fetchDepartments, fetchRoles, updateUser } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  name: string
  email: string
  password: string
  company_id: string
  company_ids: string[]
  department_id: string
  role_id: string
  role: string
  phone: string
  bio: string
  photo_path: string
  work_timezone: string
  work_schedule: WorkSchedule
  permissions_allow_text: string
  permissions_deny_text: string
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

const emptyWorkDay = (enabled: boolean): WorkScheduleDay => ({
  enabled,
  start: "09:00",
  end: "18:00",
  break_start: "13:00",
  break_end: "14:00",
})

const defaultWorkSchedule = (): WorkSchedule => ({
  mon: emptyWorkDay(true),
  tue: emptyWorkDay(true),
  wed: emptyWorkDay(true),
  thu: emptyWorkDay(true),
  fri: emptyWorkDay(true),
  sat: emptyWorkDay(false),
  sun: emptyWorkDay(false),
})

const normalizeWorkSchedule = (incoming: any): WorkSchedule => {
  const base = defaultWorkSchedule()
  if (!incoming || typeof incoming !== "object") return base

  const keys = Object.keys(base) as (keyof WorkSchedule)[]
  keys.forEach((k) => {
    const v = (incoming as any)[k]
    if (!v || typeof v !== "object") return

    base[k] = {
      enabled: typeof v.enabled === "boolean" ? v.enabled : base[k].enabled,
      start: typeof v.start === "string" ? v.start : base[k].start,
      end: typeof v.end === "string" ? v.end : base[k].end,
      break_start: typeof v.break_start === "string" ? v.break_start : base[k].break_start,
      break_end: typeof v.break_end === "string" ? v.break_end : base[k].break_end,
    }
  })

  return base
}

export default function UserForm() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const isEdit = Boolean(id)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const [photoInputKey, setPhotoInputKey] = useState(0)
  const [replacePhotoOpen, setReplacePhotoOpen] = useState(false)
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null)

  const defaultTimezone = useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
      return typeof tz === "string" && tz.trim() ? tz : "Europe/Lisbon"
    } catch {
      return "Europe/Lisbon"
    }
  }, [])

  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    company_id: "",
    company_ids: [],
    department_id: "",
    role_id: "",
    role: "",
    phone: "",
    bio: "",
    photo_path: "",
    work_timezone: defaultTimezone,
    work_schedule: defaultWorkSchedule(),
    permissions_allow_text: "",
    permissions_deny_text: "",
    is_active: true,
  })

  const title = useMemo(() => (isEdit ? "Editar utilizador" : "Novo utilizador"), [isEdit])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const filteredDepartments = useMemo(() => {
    if (!form.company_id) return departments
    return departments.filter((d) => d.company_id === form.company_id)
  }, [departments, form.company_id])

  const processPhotoFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast({ title: "Erro", description: "Selecione um ficheiro de imagem.", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
        return
      }

      const maxBytes = 2 * 1024 * 1024
      if (file.size > maxBytes) {
        toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
        return
      }

      const reader = new FileReader()

      reader.onload = () => {
        const result = reader.result
        if (typeof result === "string") {
          setField("photo_path", result)
          setPhotoInputKey((k) => k + 1)
          return
        }
        toast({ title: "Erro", description: "Não foi possível ler a imagem.", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
      }

      reader.onerror = () => {
        toast({ title: "Erro", description: "Falha ao ler a imagem.", variant: "destructive" })
        setPhotoInputKey((k) => k + 1)
      }

      reader.readAsDataURL(file)
    },
    [setField, toast]
  )

  const handlePhotoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      if (form.photo_path.trim()) {
        setPendingPhotoFile(file)
        setReplacePhotoOpen(true)
        return
      }

      processPhotoFile(file)
    },
    [form.photo_path, processPhotoFile]
  )

  useEffect(() => {
    setLoading(true)

    Promise.all([
      fetchCompanies(),
      fetchDepartments(),
      fetchRoles({ is_active: true }),
      isEdit && id ? fetchAdminUser(id) : Promise.resolve(null),
    ])
      .then(([compsResp, depsResp, rolesResp, userResp]) => {
        setCompanies(compsResp.data)
        setDepartments(depsResp.data)
        setRoles(rolesResp.data)

        if (userResp?.data) {
          const u = userResp.data
          const companyIds = Array.isArray(u.company_ids)
            ? u.company_ids.filter(Boolean)
            : u.company_id
              ? [u.company_id]
              : []

          setForm({
            name: u.name ?? "",
            email: u.email ?? "",
            password: "",
            company_id: u.company_id ?? "",
            company_ids: companyIds,
            department_id: u.department_id ?? "",
            role_id: u.role_id ?? "",
            role: u.role ?? "",
            phone: u.phone ?? "",
            bio: u.bio ?? "",
            photo_path: u.photo_path ?? "",
            work_timezone: (u.work_timezone ?? "").trim() || defaultTimezone,
            work_schedule: normalizeWorkSchedule(u.work_schedule),
            permissions_allow_text: Array.isArray(u.permissions_allow) ? u.permissions_allow.join("\n") : "",
            permissions_deny_text: Array.isArray(u.permissions_deny) ? u.permissions_deny.join("\n") : "",
            is_active: Boolean(u.is_active),
          })
          return
        }

        const defaultCompanyId = compsResp.data[0]?.id || ""
        const defaultRole = rolesResp.data[0]

        setForm((prev) => {
          const nextCompanyId = prev.company_id || defaultCompanyId
          const nextCompanyIds = prev.company_ids.length
            ? prev.company_ids
            : nextCompanyId
              ? [nextCompanyId]
              : []

          return {
            ...prev,
            company_id: nextCompanyId,
            company_ids: nextCompanyIds,
            role_id: prev.role_id || defaultRole?.id || "",
            role: prev.role || defaultRole?.name || "",
          }
        })
      })
      .catch(() => {
        if (isEdit) {
          toast({ title: "Erro", description: "Utilizador não encontrado", variant: "destructive" })
          navigate("/admin/users", { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, toast])

  useEffect(() => {
    if (!form.company_id) return
    if (!form.department_id) return
    const dep = departments.find((d) => d.id === form.department_id)
    if (dep && dep.company_id !== form.company_id) {
      setField("department_id", "")
    }
  }, [departments, form.company_id, form.department_id, setField])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const name = form.name.trim()
    const email = form.email.trim()

    if (!name) {
      toast({ title: "Erro", description: "O nome é obrigatório", variant: "destructive" })
      return
    }
    if (!email) {
      toast({ title: "Erro", description: "O email é obrigatório", variant: "destructive" })
      return
    }
    if (!isEdit && !form.password.trim()) {
      toast({ title: "Erro", description: "A password é obrigatória ao criar", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        const payload: Partial<Omit<User, "id" | "createdAt">> = {
          name,
          email,
          company_id: form.company_id.trim() || null,
          company_ids: form.company_ids,
          department_id: form.department_id.trim() || null,
          role_id: form.role_id.trim() || null,
          role: form.role.trim() || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          photo_path: form.photo_path.trim() || null,
          work_timezone: form.work_timezone.trim() || null,
          work_schedule: form.work_schedule,
          permissions_allow: parsePermissions(form.permissions_allow_text),
          permissions_deny: parsePermissions(form.permissions_deny_text),
          is_active: form.is_active,
        }

        const pwd = form.password.trim()
        if (pwd) payload.password = pwd

        const r = await updateUser(id, payload)
        toast({ title: "Sucesso", description: "Utilizador atualizado" })
        navigate(`/admin/users/${r.data.id}`)
      } else {
        const r = await createUser({
          name,
          email,
          password: form.password.trim() || null,
          company_id: form.company_id.trim() || null,
          company_ids: form.company_ids,
          department_id: form.department_id.trim() || null,
          role_id: form.role_id.trim() || null,
          role: form.role.trim() || null,
          phone: form.phone.trim() || null,
          bio: form.bio.trim() || null,
          photo_path: form.photo_path.trim() || null,
          work_timezone: form.work_timezone.trim() || null,
          work_schedule: form.work_schedule,
          permissions_allow: parsePermissions(form.permissions_allow_text),
          permissions_deny: parsePermissions(form.permissions_deny_text),
          is_active: form.is_active,
          last_login_at: null,
        } as Omit<User, "id" | "createdAt" | "updatedAt">)

        toast({ title: "Sucesso", description: "Utilizador criado" })
        navigate(`/admin/users/${r.data.id}`)
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
          <p className="page-subtitle">Administração → Utilizadores</p>
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
            <p className="page-subtitle">Administração → Utilizadores</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/users">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="user-form" disabled={saving || !form.name.trim() || !form.email.trim()}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="user-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome</label>
            <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Nome do utilizador" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@empresa.com" />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password {isEdit ? "(opcional)" : ""}</label>
            <Input
              type="password"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              placeholder={isEdit ? "Deixe vazio para manter" : "Defina uma password"}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Telefone</label>
            <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+351 ..." />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Empresa principal</label>
            <Select
              value={form.company_id}
              onValueChange={(v) => {
                setForm((prev) => {
                  const nextIds = prev.company_ids.includes(v) ? prev.company_ids : [...prev.company_ids, v]
                  return { ...prev, company_id: v, company_ids: nextIds }
                })
              }}
            >
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
            <div className="text-xs text-muted-foreground">Define a empresa usada como contexto principal (departamento, filtros, etc.).</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Empresas (acesso)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const all = companies.map((c) => c.id)
                  setForm((prev) => ({ ...prev, company_ids: all, company_id: prev.company_id || all[0] || "" }))
                }}
              >
                Selecionar todas
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border border-border p-3 bg-background/30">
              {companies.map((c) => {
                const checked = form.company_ids.includes(c.id)
                return (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(next) => {
                        const on = next === true
                        setForm((prev) => {
                          const already = prev.company_ids.includes(c.id)
                          const nextIds = on
                            ? already
                              ? prev.company_ids
                              : [...prev.company_ids, c.id]
                            : prev.company_ids.filter((id) => id !== c.id)

                          let nextPrimary = prev.company_id
                          if (!nextIds.includes(nextPrimary)) nextPrimary = nextIds[0] || ""

                          let nextDepartment = prev.department_id
                          if (nextPrimary && nextDepartment) {
                            const dep = departments.find((d) => d.id === nextDepartment)
                            if (dep && dep.company_id !== nextPrimary) nextDepartment = ""
                          }
                          if (!nextPrimary) nextDepartment = ""

                          return {
                            ...prev,
                            company_ids: nextIds,
                            company_id: nextPrimary,
                            department_id: nextDepartment,
                          }
                        })
                      }}
                    />
                    <span className="truncate">{c.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Departamento</label>
            <Select value={form.department_id} onValueChange={(v) => setField("department_id", v === CLEAR_SELECT_VALUE ? "" : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                {filteredDepartments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select
              value={form.role_id}
              onValueChange={(v) => {
                const nextId = v === CLEAR_SELECT_VALUE ? "" : v
                setField("role_id", nextId)
                const selected = roles.find((r) => r.id === nextId)
                setField("role", selected?.name ?? "")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.display_name ?? r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium">Foto</label>
              {form.photo_path.trim() && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setField("photo_path", "")
                    setPhotoInputKey((k) => k + 1)
                  }}
                >
                  <X />
                  Remover
                </Button>
              )}
            </div>

            {form.photo_path.trim() && (
              <div className="flex items-center gap-4 rounded-lg border border-border p-4 bg-background/40">
                <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                  <img src={form.photo_path} alt="Foto" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">Pré-visualização</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {form.photo_path.startsWith("data:") ? "Imagem carregada do computador" : form.photo_path}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Enviar do computador</div>
                <Input key={photoInputKey} type="file" accept="image/*" onChange={handlePhotoFileChange} className="cursor-pointer" />
                <div className="text-xs text-muted-foreground">Guarda localmente (sem upload para o servidor).</div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">Ou URL/caminho</div>
                <Input
                  value={form.photo_path.trim().startsWith("data:") ? "" : form.photo_path}
                  onChange={(e) => setField("photo_path", e.target.value)}
                  placeholder="https://... ou /storage/..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea value={form.bio} onChange={(e) => setField("bio", e.target.value)} placeholder="Descrição/observações" />
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Horário de trabalho</div>
              <div className="text-xs text-muted-foreground">Não está ligado ao relógio de ponto. Serve como referência/configuração para futuras integrações.</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Timezone</label>
                <Input value={form.work_timezone} onChange={(e) => setField("work_timezone", e.target.value)} placeholder="Europe/Lisbon" />
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[760px] grid grid-cols-[160px_90px_120px_120px_120px_120px] gap-2 items-center text-sm">
                <div className="text-xs text-muted-foreground">Dia</div>
                <div className="text-xs text-muted-foreground">Ativo</div>
                <div className="text-xs text-muted-foreground">Entrada</div>
                <div className="text-xs text-muted-foreground">Saída</div>
                <div className="text-xs text-muted-foreground">Início intervalo</div>
                <div className="text-xs text-muted-foreground">Fim intervalo</div>

                {([
                  ["mon", "Segunda"],
                  ["tue", "Terça"],
                  ["wed", "Quarta"],
                  ["thu", "Quinta"],
                  ["fri", "Sexta"],
                  ["sat", "Sábado"],
                  ["sun", "Domingo"],
                ] as const).map(([key, label]) => {
                  const day = form.work_schedule[key]
                  return (
                    <div key={key} className="contents">
                      <div className="font-medium">{label}</div>
                      <div>
                        <Switch
                          checked={day.enabled}
                          onCheckedChange={(v) =>
                            setForm((prev) => ({
                              ...prev,
                              work_schedule: {
                                ...prev.work_schedule,
                                [key]: { ...prev.work_schedule[key], enabled: Boolean(v) },
                              },
                            }))
                          }
                        />
                      </div>
                      <Input
                        type="time"
                        value={day.start}
                        disabled={!day.enabled}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            work_schedule: {
                              ...prev.work_schedule,
                              [key]: { ...prev.work_schedule[key], start: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        value={day.end}
                        disabled={!day.enabled}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            work_schedule: {
                              ...prev.work_schedule,
                              [key]: { ...prev.work_schedule[key], end: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        value={day.break_start}
                        disabled={!day.enabled}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            work_schedule: {
                              ...prev.work_schedule,
                              [key]: { ...prev.work_schedule[key], break_start: e.target.value },
                            },
                          }))
                        }
                      />
                      <Input
                        type="time"
                        value={day.break_end}
                        disabled={!day.enabled}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            work_schedule: {
                              ...prev.work_schedule,
                              [key]: { ...prev.work_schedule[key], break_end: e.target.value },
                            },
                          }))
                        }
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Permissões individuais</div>
              <div className="text-xs text-muted-foreground">Exceções ao cargo: negar tem prioridade sobre permitir.</div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Permitir (adicionais)</label>
                <Textarea
                  value={form.permissions_allow_text}
                  onChange={(e) => setField("permissions_allow_text", e.target.value)}
                  placeholder={'Uma por linha (ou separadas por vírgula)\ncrm.*\nhr.employees.read'}
                  className="min-h-[120px]"
                />
                <div className="text-xs text-muted-foreground">Guarda em permissions_allow (array).</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Negar</label>
                <Textarea
                  value={form.permissions_deny_text}
                  onChange={(e) => setField("permissions_deny_text", e.target.value)}
                  placeholder={'Uma por linha (ou separadas por vírgula)\nhr.*'}
                  className="min-h-[120px]"
                />
                <div className="text-xs text-muted-foreground">Guarda em permissions_deny (array). Deny substitui o cargo.</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-2">
            <div>
              <div className="text-sm font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Controla o campo is_active do modelo</div>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(v) => setField("is_active", Boolean(v) as any)} />
          </div>
        </div>
      </form>

      {replacePhotoOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setReplacePhotoOpen(false)
            setPendingPhotoFile(null)
            setPhotoInputKey((k) => k + 1)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Substituir foto?</div>
              <div className="text-sm text-muted-foreground">Já existe uma foto definida. Deseja substituir?</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReplacePhotoOpen(false)
                  setPendingPhotoFile(null)
                  setPhotoInputKey((k) => k + 1)
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const file = pendingPhotoFile
                  setReplacePhotoOpen(false)
                  setPendingPhotoFile(null)
                  if (file) processPhotoFile(file)
                  else setPhotoInputKey((k) => k + 1)
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