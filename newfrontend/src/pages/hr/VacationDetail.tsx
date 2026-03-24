import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Check, Save, X } from "lucide-react"

import type { Company, Employee, Vacation, VacationStatus, VacationType } from "@/types"
import { createVacation, fetchCompanies, fetchEmployees, fetchVacation, updateVacation } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  employee_id: string
  company_id: string
  vacation_type: VacationType
  start_date: string
  end_date: string
  requested_days: string
  status: VacationStatus
  employee_notes: string
  manager_notes: string
  rejection_reason: string
}

const vacationTypes: Array<{ value: VacationType; label: string }> = [
  { value: "annual_leave", label: "Férias Anuais" },
  { value: "maternity_leave", label: "Licença de Maternidade" },
  { value: "paternity_leave", label: "Licença de Paternidade" },
  { value: "sick_leave", label: "Baixa Médica" },
  { value: "marriage_leave", label: "Licença de Casamento" },
  { value: "bereavement_leave", label: "Licença por Luto" },
  { value: "study_leave", label: "Licença para Estudos" },
  { value: "unpaid_leave", label: "Licença Sem Vencimento" },
  { value: "compensatory_leave", label: "Férias Compensatórias" },
  { value: "advance_leave", label: "Adiantamento de Férias" },
  { value: "other", label: "Outro" },
]

const emptyForm = (): FormState => ({
  employee_id: "",
  company_id: "",
  vacation_type: "annual_leave",
  start_date: "",
  end_date: "",
  requested_days: "0",
  status: "pending",
  employee_notes: "",
  manager_notes: "",
  rejection_reason: "",
})

const daysBetweenInclusive = (start: string, end: string) => {
  if (!start || !end) return 0
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  const ms = e.getTime() - s.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
  return Number.isFinite(days) ? Math.max(0, days) : 0
}

const toDateInputValue = (raw: unknown) => {
  const s = String(raw ?? "").trim()
  if (!s) return ""
  return s.split("T")[0].split(" ")[0]
}

export default function VacationDetail() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [requestedAt, setRequestedAt] = useState<string | null>(null)
  const [approvedAt, setApprovedAt] = useState<string | null>(null)
  const [rejectedAt, setRejectedAt] = useState<string | null>(null)
  const [approvedBy, setApprovedBy] = useState<string | null>(null)
  const [rejectedBy, setRejectedBy] = useState<string | null>(null)

  const title = isEdit ? "Editar férias" : "Nova solicitação de férias"

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const requestedDays = useMemo(() => {
    return daysBetweenInclusive(form.start_date, form.end_date)
  }, [form.start_date, form.end_date])

  useEffect(() => {
    setField("requested_days", String(requestedDays))
  }, [requestedDays, setField])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchCompanies(), isEdit && id ? fetchVacation(id) : Promise.resolve(null)])
      .then(([empResp, compResp, vacResp]) => {
        setEmployees(empResp.data)
        setCompanies(compResp.data)

        if (vacResp?.data) {
          const v = vacResp.data
          setRequestedAt(v.requested_at ? String(v.requested_at) : null)
          setApprovedAt(v.approved_at ? String(v.approved_at) : null)
          setRejectedAt(v.rejected_at ? String(v.rejected_at) : null)
          setApprovedBy(v.approved_by ? String(v.approved_by) : null)
          setRejectedBy(v.rejected_by ? String(v.rejected_by) : null)
          setForm({
            employee_id: String(v.employee_id ?? ""),
            company_id: String(v.company_id ?? ""),
            vacation_type: (v.vacation_type ?? "annual_leave") as VacationType,
            start_date: toDateInputValue(v.start_date),
            end_date: toDateInputValue(v.end_date),
            requested_days: String(v.requested_days ?? 0),
            status: (v.status ?? "pending") as VacationStatus,
            employee_notes: String(v.employee_notes ?? ""),
            manager_notes: String(v.manager_notes ?? ""),
            rejection_reason: String(v.rejection_reason ?? ""),
          })
        }
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar a solicitação", variant: "destructive" })
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

  const save = async (nextStatus?: VacationStatus) => {
    if (!form.employee_id) {
      toast({ title: "Validação", description: "Funcionário é obrigatório", variant: "destructive" })
      return
    }

    if (!form.company_id) {
      toast({ title: "Validação", description: "Empresa é obrigatória", variant: "destructive" })
      return
    }

    if (!form.start_date || !form.end_date) {
      toast({ title: "Validação", description: "Informe data de início e fim", variant: "destructive" })
      return
    }

    const days = daysBetweenInclusive(form.start_date, form.end_date)
    if (days <= 0) {
      toast({ title: "Validação", description: "Período inválido", variant: "destructive" })
      return
    }

    const status = (nextStatus ?? form.status ?? "pending") as VacationStatus
    if (status === "rejected" && !form.rejection_reason.trim()) {
      toast({ title: "Validação", description: "Motivo da rejeição é obrigatório", variant: "destructive" })
      return
    }

    const now = new Date().toISOString()
    const vacationYear = Number(form.start_date.slice(0, 4)) || null

    const payload: Omit<Vacation, "id" | "createdAt" | "updatedAt"> = {
      employee_id: form.employee_id,
      company_id: form.company_id,
      vacation_type: (form.vacation_type ?? "other") as VacationType,
      start_date: form.start_date,
      end_date: form.end_date,
      requested_days: days,
      approved_days: status === "approved" ? days : status === "rejected" ? 0 : null,
      vacation_year: vacationYear,
      status,
      requested_at: isEdit ? requestedAt ?? now : now,
      approved_at: status === "approved" ? now : null,
      rejected_at: status === "rejected" ? now : null,
      employee_notes: form.employee_notes.trim() || null,
      manager_notes: form.manager_notes.trim() || null,
      rejection_reason: status === "rejected" ? form.rejection_reason.trim() : null,
      approved_by: null,
      rejected_by: null,
      created_by: null,
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updateVacation(id, payload)
        toast({ title: "Guardado", description: "Solicitação atualizada" })
      } else {
        await createVacation(payload)
        toast({ title: "Criado", description: "Solicitação criada" })
      }
      navigate("/hr/vacations")
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar a solicitação", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await save()
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Recursos Humanos → Férias</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  const showApprovalFields = form.status === "approved" || form.status === "rejected"

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Recursos Humanos → Férias</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/hr/vacations">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            {isEdit && form.status === "pending" ? (
              <Button type="button" variant="outline" disabled={saving} onClick={() => save("approved")}>
                <Check />
                Aprovar
              </Button>
            ) : null}
            {isEdit && form.status === "pending" ? (
              <Button
                type="button"
                variant="destructive"
                disabled={saving}
                onClick={() => {
                  if (form.rejection_reason.trim()) {
                    void save("rejected")
                    return
                  }
                  setField("status", "rejected")
                  toast({ title: "Validação", description: "Informe o motivo da rejeição", variant: "destructive" })
                }}
              >
                <X />
                Rejeitar
              </Button>
            ) : null}
            <Button type="submit" form="vacation-form" disabled={saving}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="vacation-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Informações da Solicitação</div>

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
              <label className="text-sm font-medium">Tipo</label>
              <Select value={String(form.vacation_type)} onValueChange={(v) => setField("vacation_type", v as VacationType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {vacationTypes.map((t) => (
                    <SelectItem key={String(t.value)} value={String(t.value)}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Período de Férias</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Início</label>
              <Input value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} type="date" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Fim</label>
              <Input value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} type="date" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dias Solicitados</label>
              <Input value={form.requested_days} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Status e Aprovação</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={String(form.status)} onValueChange={(v) => setField("status", v as VacationStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Rejeitado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Solicitado em</label>
              <Input value={requestedAt ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aprovado em</label>
              <Input value={approvedAt ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rejeitado em</label>
              <Input value={rejectedAt ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Aprovado por</label>
              <Input value={approvedBy ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Rejeitado por</label>
              <Input value={rejectedBy ?? ""} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Observações</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium">Observações do Funcionário</label>
              <Textarea value={form.employee_notes} onChange={(e) => setField("employee_notes", e.target.value)} rows={3} disabled />
            </div>

            {form.status === "rejected" ? (
              <div className="space-y-2 lg:col-span-1">
                <label className="text-sm font-medium">Motivo da Rejeição</label>
                <Textarea value={form.rejection_reason} onChange={(e) => setField("rejection_reason", e.target.value)} rows={3} />
              </div>
            ) : (
              <div className="lg:col-span-1" />
            )}

            <div className="space-y-2 lg:col-span-1">
              <label className="text-sm font-medium">Observações do Gestor</label>
              <Textarea value={form.manager_notes} onChange={(e) => setField("manager_notes", e.target.value)} rows={3} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}