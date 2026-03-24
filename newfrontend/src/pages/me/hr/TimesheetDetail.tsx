import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Employee, Timesheet } from "@/types"
import { createTimesheet, fetchMyEmployee, fetchTimesheet } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  work_date: string
  clock_in: string
  lunch_start: string
  lunch_end: string
  clock_out: string
  expected_hours: string
  employee_notes: string
}

const emptyForm = (): FormState => ({
  work_date: "",
  clock_in: "",
  lunch_start: "",
  lunch_end: "",
  clock_out: "",
  expected_hours: "8",
  employee_notes: "",
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

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null)
  const [form, setForm] = useState<FormState>(() => emptyForm())

  const title = isEdit ? "Detalhe do ponto" : "Novo ponto"

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
    let alive = true
    setLoading(true)

    fetchMyEmployee()
      .then(async (me) => {
        if (!alive) return
        setMyEmployee(me.data)

        if (isEdit && id) {
          const ts = await fetchTimesheet(id)
          if (!alive) return

          if (String(ts.data.employee_id) !== String(me.data.id)) {
            toast({ title: "Acesso restrito", description: "Este registo não pertence ao teu utilizador.", variant: "destructive" })
            navigate("/me/hr/timesheets", { replace: true })
            return
          }

          setForm({
            work_date: String(ts.data.work_date ?? ""),
            clock_in: String(ts.data.clock_in ?? ""),
            lunch_start: String(ts.data.lunch_start ?? ""),
            lunch_end: String(ts.data.lunch_end ?? ""),
            clock_out: String(ts.data.clock_out ?? ""),
            expected_hours: String(ts.data.expected_hours ?? 8),
            employee_notes: String(ts.data.employee_notes ?? ""),
          })
          return
        }

        setForm((prev) => ({ ...prev, work_date: new Date().toISOString().split("T")[0] }))
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar o registo", variant: "destructive" })
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

    if (!myEmployee?.id) {
      toast({ title: "Erro", description: "Funcionário não identificado", variant: "destructive" })
      return
    }

    if (!myEmployee.company_id) {
      toast({ title: "Validação", description: "Empresa não identificada para o teu registo", variant: "destructive" })
      return
    }

    if (!form.work_date) {
      toast({ title: "Validação", description: "Data é obrigatória", variant: "destructive" })
      return
    }

    const expected = toNumberOrNull(form.expected_hours) ?? 8

    const payload: Omit<Timesheet, "id" | "createdAt" | "updatedAt"> = {
      employee_id: String(myEmployee.id),
      company_id: String(myEmployee.company_id),
      work_date: form.work_date,
      clock_in: form.clock_in || null,
      lunch_start: form.lunch_start || null,
      lunch_end: form.lunch_end || null,
      clock_out: form.clock_out || null,
      total_hours: totals.total_hours,
      lunch_hours: totals.lunch_hours,
      overtime_hours: totals.overtime_hours,
      expected_hours: expected,
      status: "present",
      day_type: null,
      ip_address: null,
      location: null,
      device_info: null,
      employee_notes: form.employee_notes.trim() || null,
      manager_notes: null,
      approved_by: null,
      approved_at: null,
    }

    setSaving(true)
    try {
      await createTimesheet(payload)
      toast({ title: "Guardado", description: "Ponto registado" })
      navigate("/me/hr/timesheets")
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar o registo", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Meu RH → Marcação de Ponto</p>
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
            <p className="page-subtitle">Meu RH → Marcação de Ponto</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/me/hr/timesheets">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            {!isEdit ? (
              <Button type="submit" form="timesheet-form" disabled={saving}>
                <Save />
                {saving ? "A guardar…" : "Guardar"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <form id="timesheet-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Colaborador</div>

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
              <label className="text-sm font-medium">Horas esperadas</label>
              <Input value={form.expected_hours} onChange={(e) => setField("expected_hours", e.target.value)} type="number" step="0.5" disabled={isEdit} />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Registo</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} type="date" disabled={isEdit} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Entrada</label>
              <Input value={form.clock_in} onChange={(e) => setField("clock_in", e.target.value)} type="time" disabled={isEdit} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Saída</label>
              <Input value={form.clock_out} onChange={(e) => setField("clock_out", e.target.value)} type="time" disabled={isEdit} />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Início almoço</label>
              <Input value={form.lunch_start} onChange={(e) => setField("lunch_start", e.target.value)} type="time" disabled={isEdit} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fim almoço</label>
              <Input value={form.lunch_end} onChange={(e) => setField("lunch_end", e.target.value)} type="time" disabled={isEdit} />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Total / Extra</label>
              <Input value={`${totals.total_hours.toFixed(2)}h / ${totals.overtime_hours.toFixed(2)}h`} disabled />
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={form.employee_notes} onChange={(e) => setField("employee_notes", e.target.value)} rows={3} disabled={isEdit} />
          </div>
        </div>
      </form>
    </div>
  )
}