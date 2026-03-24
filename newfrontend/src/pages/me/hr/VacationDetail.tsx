import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Employee, Vacation, VacationStatus, VacationType } from "@/types"
import { createVacation, fetchMyEmployee, fetchUser, fetchVacation } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  vacation_type: VacationType
  start_date: string
  end_date: string
  requested_days: string
  employee_notes: string
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
  vacation_type: "annual_leave",
  start_date: "",
  end_date: "",
  requested_days: "0",
  employee_notes: "",
})

const daysBetweenInclusive = (start: string, end: string) => {
  if (!start || !end) return 0
  const s = new Date(`${start}T00:00:00`)
  const e = new Date(`${end}T00:00:00`)
  const ms = e.getTime() - s.getTime()
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1
  return Number.isFinite(days) ? Math.max(0, days) : 0
}

const fmtDate = (iso?: string | null) => {
  const raw = String(iso ?? "").trim()
  if (!raw) return "—"
  return new Date(raw).toLocaleString("pt-PT")
}

export default function VacationDetail() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null)
  const [vacation, setVacation] = useState<Vacation | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())

  const title = isEdit ? "Detalhe de férias" : "Nova solicitação de férias"

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const requestedDays = useMemo(() => daysBetweenInclusive(form.start_date, form.end_date), [form.start_date, form.end_date])

  useEffect(() => {
    setField("requested_days", String(requestedDays))
  }, [requestedDays, setField])

  useEffect(() => {
    let alive = true
    setLoading(true)

    ;(async () => {
      let meEmployee: Employee | null = null

      try {
        const me = await fetchMyEmployee()
        meEmployee = me.data
      } catch {
        try {
          const me = await fetchUser()
          const now = new Date().toISOString()
          meEmployee = {
            id: "",
            name: String(me.data.name ?? ""),
            email: me.data.email ?? null,
            company_id: null,
            createdAt: now,
            updatedAt: now,
          }
        } catch {
          meEmployee = null
        }
      }

      if (!alive) return
      setMyEmployee(meEmployee)

      if (!isEdit || !id) {
        setVacation(null)
        return
      }

      const vac = await fetchVacation(id)
      if (!alive) return

      if (meEmployee?.id && String(vac.data.employee_id) !== String(meEmployee.id)) {
        toast({ title: "Acesso restrito", description: "Esta solicitação não pertence ao teu utilizador.", variant: "destructive" })
        navigate("/me/hr/vacations", { replace: true })
        return
      }

      setVacation(vac.data)
      setForm({
        vacation_type: (vac.data.vacation_type ?? "annual_leave") as VacationType,
        start_date: String(vac.data.start_date ?? ""),
        end_date: String(vac.data.end_date ?? ""),
        requested_days: String(vac.data.requested_days ?? 0),
        employee_notes: String(vac.data.employee_notes ?? ""),
      })
    })()
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar a solicitação", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [id, isEdit, navigate, toast])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isEdit) return



    if (!form.start_date || !form.end_date) {
      toast({ title: "Validação", description: "Informe data de início e fim", variant: "destructive" })
      return
    }

    const days = daysBetweenInclusive(form.start_date, form.end_date)
    if (days <= 0) {
      toast({ title: "Validação", description: "Período inválido", variant: "destructive" })
      return
    }

    const now = new Date().toISOString()
    const vacationYear = Number(form.start_date.slice(0, 4)) || null

    const payload: Omit<Vacation, "id" | "createdAt" | "updatedAt"> = {
      employee_id: String(myEmployee?.id ?? ""),
      company_id: String(myEmployee?.company_id ?? ""),
      vacation_type: (form.vacation_type ?? "other") as VacationType,
      start_date: form.start_date,
      end_date: form.end_date,
      requested_days: days,
      approved_days: null,
      vacation_year: vacationYear,
      status: "pending",
      requested_at: now,
      approved_at: null,
      rejected_at: null,
      employee_notes: form.employee_notes.trim() || null,
      manager_notes: null,
      rejection_reason: null,
      approved_by: null,
      rejected_by: null,
      created_by: null,
    }

    setSaving(true)
    try {
      await createVacation(payload)
      toast({ title: "Enviado", description: "Solicitação criada" })
      navigate("/me/hr/vacations")
    } catch {
      toast({ title: "Erro", description: "Não foi possível enviar a solicitação", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Meu RH → Férias</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  const status: VacationStatus = (vacation?.status ?? "pending") as VacationStatus

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Meu RH → Férias</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/me/hr/vacations">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            {!isEdit ? (
              <Button type="submit" form="vacation-form" disabled={saving}>
                <Save />
                {saving ? "A enviar…" : "Enviar"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <form id="vacation-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Funcionário</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input value={myEmployee?.name ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Empresa</label>
              <Input value={myEmployee?.company_id ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Input value={String(status)} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Solicitação</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={String(form.vacation_type)}
                onValueChange={(v) => setField("vacation_type", v as VacationType)}
                disabled={isEdit}
              >
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Início</label>
              <Input value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} type="date" disabled={isEdit} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data de Fim</label>
              <Input value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} type="date" disabled={isEdit} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Dias Solicitados</label>
              <Input value={form.requested_days} disabled />
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Observações</label>
              <Textarea value={form.employee_notes} onChange={(e) => setField("employee_notes", e.target.value)} rows={3} disabled={isEdit} />
            </div>
          </div>
        </div>

        {isEdit ? (
          <div className="rounded-lg border border-border p-4">
            <div className="text-sm font-semibold">Gestão</div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Solicitado em</label>
                <Input value={fmtDate(vacation?.requested_at ?? null)} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Aprovado em</label>
                <Input value={fmtDate(vacation?.approved_at ?? null)} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Rejeitado em</label>
                <Input value={fmtDate(vacation?.rejected_at ?? null)} disabled />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-sm font-medium">Notas do Gestor</label>
                <Textarea value={String(vacation?.manager_notes ?? "")} rows={3} disabled />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Motivo (se rejeitado)</label>
                <Textarea value={String(vacation?.rejection_reason ?? "")} rows={3} disabled />
              </div>
            </div>
          </div>
        ) : null}
      </form>
    </div>
  )
}