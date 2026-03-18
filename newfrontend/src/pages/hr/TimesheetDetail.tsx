import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Company, Employee, Timesheet, TimesheetStatus } from "@/types"
import { createTimesheet, fetchCompanies, fetchEmployees, fetchTimesheet, updateTimesheet } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  employee_id: string
  company_id: string
  work_date: string
  clock_in: string
  lunch_start: string
  lunch_end: string
  clock_out: string
  expected_hours: string
  status: TimesheetStatus
  ip_address: string
  location: string
  device_info: string
  employee_notes: string
  manager_notes: string
  approved_by: string
  approved_at: string
}

const emptyForm = (): FormState => ({
  employee_id: "",
  company_id: "",
  work_date: "",
  clock_in: "",
  lunch_start: "",
  lunch_end: "",
  clock_out: "",
  expected_hours: "8",
  status: "present",
  ip_address: "",
  location: "",
  device_info: "",
  employee_notes: "",
  manager_notes: "",
  approved_by: "",
  approved_at: "",
})

const parseTimeToMinutes = (t?: string | null) => {
  if (!t) return null
  const [hh, mm] = t.split(":").map((x) => Number(x))
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null
  return hh * 60 + mm
}

const computeTotals = (input: {
  clock_in?: string | null
  clock_out?: string | null
  lunch_start?: string | null
  lunch_end?: string | null
  expected_hours?: number | null
}) => {
  const inMin = parseTimeToMinutes(input.clock_in)
  const outMin = parseTimeToMinutes(input.clock_out)
  const lsMin = parseTimeToMinutes(input.lunch_start)
  const leMin = parseTimeToMinutes(input.lunch_end)

  if (inMin === null || outMin === null || outMin <= inMin) {
    return { total_hours: 0, lunch_hours: 0, overtime_hours: 0 }
  }

  let totalMinutes = outMin - inMin

  let lunchMinutes = 0
  if (lsMin !== null && leMin !== null && leMin > lsMin) {
    lunchMinutes = leMin - lsMin
    totalMinutes = Math.max(0, totalMinutes - lunchMinutes)
  }

  const total_hours = Math.round((totalMinutes / 60) * 100) / 100
  const lunch_hours = Math.round((lunchMinutes / 60) * 100) / 100
  const expected = input.expected_hours ?? 8
  const overtime_hours = Math.max(0, Math.round((total_hours - expected) * 100) / 100)

  return { total_hours, lunch_hours, overtime_hours }
}

const toNumberOrNull = (v: string) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return n
}

export default function TimesheetDetail() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState<FormState>(() => emptyForm())

  const title = isEdit ? "Editar ponto" : "Novo ponto"

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const totals = useMemo(() => {
    const expected = toNumberOrNull(form.expected_hours) ?? 8
    return computeTotals({
      clock_in: form.clock_in || null,
      clock_out: form.clock_out || null,
      lunch_start: form.lunch_start || null,
      lunch_end: form.lunch_end || null,
      expected_hours: expected,
    })
  }, [form.clock_in, form.clock_out, form.lunch_start, form.lunch_end, form.expected_hours])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchCompanies(), isEdit && id ? fetchTimesheet(id) : Promise.resolve(null)])
      .then(([empResp, compResp, tsResp]) => {
        setEmployees(empResp.data)
        setCompanies(compResp.data)

        if (tsResp?.data) {
          const t = tsResp.data
          setForm({
            employee_id: String(t.employee_id ?? ""),
            company_id: String(t.company_id ?? ""),
            work_date: String(t.work_date ?? ""),
            clock_in: String(t.clock_in ?? ""),
            lunch_start: String(t.lunch_start ?? ""),
            lunch_end: String(t.lunch_end ?? ""),
            clock_out: String(t.clock_out ?? ""),
            expected_hours: String(t.expected_hours ?? 8),
            status: (t.status ?? "present") as TimesheetStatus,
            ip_address: String(t.ip_address ?? ""),
            location: String(t.location ?? ""),
            device_info: String(t.device_info ?? ""),
            employee_notes: String(t.employee_notes ?? ""),
            manager_notes: String(t.manager_notes ?? ""),
            approved_by: String(t.approved_by ?? ""),
            approved_at: t.approved_at ? String(t.approved_at).slice(0, 16) : "",
          })
        } else {
          setForm((prev) => ({ ...prev, work_date: new Date().toISOString().split("T")[0] }))
        }
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar o registo", variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, toast])

  const onEmployeeChange = useCallback(
    (employeeId: string) => {
      setField("employee_id", employeeId)

      const emp = employees.find((e) => e.id === employeeId)
      if (!emp) return
      if (emp.company_id) setField("company_id", String(emp.company_id))
    },
    [employees, setField],
  )

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.employee_id) {
      toast({ title: "Validação", description: "Funcionário é obrigatório", variant: "destructive" })
      return
    }

    if (!form.company_id) {
      toast({ title: "Validação", description: "Empresa é obrigatória", variant: "destructive" })
      return
    }

    if (!form.work_date) {
      toast({ title: "Validação", description: "Data é obrigatória", variant: "destructive" })
      return
    }

    const expected = toNumberOrNull(form.expected_hours) ?? 8

    const payload: Omit<Timesheet, "id" | "createdAt" | "updatedAt"> = {
      employee_id: form.employee_id,
      company_id: form.company_id,
      work_date: form.work_date,
      clock_in: form.clock_in || null,
      lunch_start: form.lunch_start || null,
      lunch_end: form.lunch_end || null,
      clock_out: form.clock_out || null,
      total_hours: totals.total_hours,
      lunch_hours: totals.lunch_hours,
      overtime_hours: totals.overtime_hours,
      expected_hours: expected,
      status: form.status,
      day_type: null,
      ip_address: form.ip_address.trim() || null,
      location: form.location.trim() || null,
      device_info: form.device_info.trim() || null,
      employee_notes: form.employee_notes.trim() || null,
      manager_notes: form.manager_notes.trim() || null,
      approved_by: form.approved_by.trim() || null,
      approved_at: form.approved_at ? new Date(form.approved_at).toISOString() : null,
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateTimesheet(id, payload)
        toast({ title: "Guardado", description: "Ponto atualizado" })
      } else {
        await createTimesheet(payload)
        toast({ title: "Criado", description: "Ponto criado" })
      }
      navigate("/hr/timesheets")
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar o ponto", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Recursos Humanos → Marcação de Ponto</p>
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
            <p className="page-subtitle">Recursos Humanos → Marcação de Ponto</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/hr/timesheets">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="timesheet-form" disabled={saving}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="timesheet-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Informações do Ponto</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Funcionário</label>
              <Select value={form.employee_id} onValueChange={onEmployeeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Select value={form.company_id} onValueChange={(v) => setField("company_id", v)} disabled={Boolean(form.employee_id)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar empresa" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input type="date" value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Horários de Trabalho</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Entrada</label>
              <Input type="time" value={form.clock_in} onChange={(e) => setField("clock_in", e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Início do Almoço</label>
              <Input type="time" value={form.lunch_start} onChange={(e) => setField("lunch_start", e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fim do Almoço</label>
              <Input type="time" value={form.lunch_end} onChange={(e) => setField("lunch_end", e.target.value)} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Saída</label>
              <Input type="time" value={form.clock_out} onChange={(e) => setField("clock_out", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Horas Trabalhadas</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Horas esperadas</label>
              <Input value={form.expected_hours} onChange={(e) => setField("expected_hours", e.target.value)} placeholder="8" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total</label>
              <Input value={String(totals.total_hours)} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Almoço</label>
              <Input value={String(totals.lunch_hours)} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Extras</label>
              <Input value={String(totals.overtime_hours)} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Status e Localização</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={String(form.status)} onValueChange={(v) => setField("status", v as TimesheetStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Presente</SelectItem>
                  <SelectItem value="absent">Ausente</SelectItem>
                  <SelectItem value="late">Atrasado</SelectItem>
                  <SelectItem value="early_leave">Saída Antecipada</SelectItem>
                  <SelectItem value="holiday">Feriado</SelectItem>
                  <SelectItem value="sick_leave">Licença Médica</SelectItem>
                  <SelectItem value="vacation">Férias</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço IP</label>
              <Input value={form.ip_address} onChange={(e) => setField("ip_address", e.target.value)} placeholder="Preenchido automaticamente" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Localização</label>
              <Input value={form.location} onChange={(e) => setField("location", e.target.value)} placeholder="Ex: Escritório, Home Office, Cliente" />
            </div>

            <div className="space-y-2 lg:col-span-3">
              <label className="text-sm font-medium">Dispositivo</label>
              <Input value={form.device_info} onChange={(e) => setField("device_info", e.target.value)} placeholder="Ex: Web, iOS, Android" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Aprovação</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Aprovado por (ID)</label>
              <Input value={form.approved_by} onChange={(e) => setField("approved_by", e.target.value)} placeholder="usr_..." />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Aprovação</label>
              <Input type="datetime-local" value={form.approved_at} onChange={(e) => setField("approved_at", e.target.value)} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Observações</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Observações do Funcionário</label>
              <Textarea value={form.employee_notes} onChange={(e) => setField("employee_notes", e.target.value)} rows={3} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Observações do Gestor</label>
              <Textarea value={form.manager_notes} onChange={(e) => setField("manager_notes", e.target.value)} rows={3} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}