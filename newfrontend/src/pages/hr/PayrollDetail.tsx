import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { Company, Employee, Payroll, PayrollStatus } from "@/types"
import { createPayroll, fetchCompanies, fetchEmployees, fetchPayroll, updatePayroll } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type FormState = {
  employee_id: string
  company_id: string
  reference_month: string
  reference_year: string
  status: PayrollStatus
  base_salary: string
  overtime_hours: string
  overtime_amount: string
  holiday_allowance: string
  christmas_allowance: string
  meal_allowance: string
  transport_allowance: string
  other_allowances: string
  social_security_employee: string
  irs_withholding: string
  union_fee: string
  other_deductions: string
  notes: string
}

const monthOptions = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
]

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

const emptyForm = (): FormState => {
  const now = new Date()
  const month = String(now.getMonth() + 1)
  const year = String(now.getFullYear())

  return {
    employee_id: "",
    company_id: "",
    reference_month: month,
    reference_year: year,
    status: "draft",
    base_salary: "",
    overtime_hours: "0",
    overtime_amount: "0",
    holiday_allowance: "0",
    christmas_allowance: "0",
    meal_allowance: "0",
    transport_allowance: "0",
    other_allowances: "0",
    social_security_employee: "0",
    irs_withholding: "0",
    union_fee: "0",
    other_deductions: "0",
    notes: "",
  }
}

export default function PayrollDetail() {
  const { id } = useParams()
  const isEdit = Boolean(id)

  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [employees, setEmployees] = useState<Employee[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [form, setForm] = useState<FormState>(() => emptyForm())

  const title = isEdit ? "Editar vencimento" : "Novo vencimento"

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toNumberOrZero = (raw: string) => {
    const v = raw.trim()
    if (!v) return 0
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : 0
  }

  const totals = useMemo(() => {
    const grossTotal =
      toNumberOrZero(form.base_salary) +
      toNumberOrZero(form.overtime_amount) +
      toNumberOrZero(form.holiday_allowance) +
      toNumberOrZero(form.christmas_allowance) +
      toNumberOrZero(form.meal_allowance) +
      toNumberOrZero(form.transport_allowance) +
      toNumberOrZero(form.other_allowances)

    const totalDeductions =
      toNumberOrZero(form.social_security_employee) +
      toNumberOrZero(form.irs_withholding) +
      toNumberOrZero(form.union_fee) +
      toNumberOrZero(form.other_deductions)

    const netTotal = grossTotal - totalDeductions

    return {
      gross_total: grossTotal,
      total_deductions: totalDeductions,
      net_total: netTotal,
    }
  }, [
    form.base_salary,
    form.overtime_amount,
    form.holiday_allowance,
    form.christmas_allowance,
    form.meal_allowance,
    form.transport_allowance,
    form.other_allowances,
    form.social_security_employee,
    form.irs_withholding,
    form.union_fee,
    form.other_deductions,
  ])

  const years = useMemo(() => {
    const current = new Date().getFullYear()
    const list: string[] = []
    for (let y = current - 2; y <= current + 1; y += 1) list.push(String(y))
    return list
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchEmployees(), fetchCompanies(), isEdit && id ? fetchPayroll(id) : Promise.resolve(null)])
      .then(([empResp, compResp, payrollResp]) => {
        setEmployees(empResp.data)
        setCompanies(compResp.data)

        if (payrollResp?.data) {
          const p = payrollResp.data
          setForm({
            employee_id: String(p.employee_id ?? ""),
            company_id: String(p.company_id ?? ""),
            reference_month: String(p.reference_month ?? ""),
            reference_year: String(p.reference_year ?? ""),
            status: (p.status ?? "draft") as PayrollStatus,
            base_salary: String(p.base_salary ?? ""),
            overtime_hours: String(p.overtime_hours ?? 0),
            overtime_amount: String(p.overtime_amount ?? 0),
            holiday_allowance: String(p.holiday_allowance ?? 0),
            christmas_allowance: String(p.christmas_allowance ?? 0),
            meal_allowance: String(p.meal_allowance ?? 0),
            transport_allowance: String(p.transport_allowance ?? 0),
            other_allowances: String(p.other_allowances ?? 0),
            social_security_employee: String(p.social_security_employee ?? 0),
            irs_withholding: String(p.irs_withholding ?? 0),
            union_fee: String(p.union_fee ?? 0),
            other_deductions: String(p.other_deductions ?? 0),
            notes: String(p.notes ?? ""),
          })
        }
      })
      .catch(() => {
        toast({ title: "Erro", description: "Não foi possível carregar vencimento", variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, toast])

  const onEmployeeChange = useCallback(
    (employeeId: string) => {
      setField("employee_id", employeeId)

      const emp = employees.find((e) => e.id === employeeId)
      if (!emp) return

      if (emp.company_id) {
        setField("company_id", String(emp.company_id))
      }

      if (emp.salary !== null && emp.salary !== undefined) {
        const current = toNumberOrZero(form.base_salary)
        if (!form.base_salary.trim() || current === 0) {
          setField("base_salary", String(emp.salary))
        }
      }
    },
    [employees, form.base_salary, setField],
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

    const month = Number(form.reference_month)
    const year = Number(form.reference_year)
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      toast({ title: "Validação", description: "Mês de referência inválido", variant: "destructive" })
      return
    }
    if (!Number.isFinite(year) || year < 2000) {
      toast({ title: "Validação", description: "Ano de referência inválido", variant: "destructive" })
      return
    }

    const baseSalary = toNumberOrZero(form.base_salary)
    if (!Number.isFinite(baseSalary) || baseSalary <= 0) {
      toast({ title: "Validação", description: "Salário base é obrigatório", variant: "destructive" })
      return
    }

    const payload: Omit<Payroll, "id" | "createdAt" | "updatedAt"> = {
      employee_id: form.employee_id,
      company_id: form.company_id,
      reference_month: month,
      reference_year: year,
      base_salary: baseSalary,
      overtime_hours: toNumberOrZero(form.overtime_hours),
      overtime_amount: toNumberOrZero(form.overtime_amount),
      holiday_allowance: toNumberOrZero(form.holiday_allowance),
      christmas_allowance: toNumberOrZero(form.christmas_allowance),
      meal_allowance: toNumberOrZero(form.meal_allowance),
      transport_allowance: toNumberOrZero(form.transport_allowance),
      other_allowances: toNumberOrZero(form.other_allowances),
      social_security_employee: toNumberOrZero(form.social_security_employee),
      social_security_employer: 0,
      irs_withholding: toNumberOrZero(form.irs_withholding),
      union_fee: toNumberOrZero(form.union_fee),
      other_deductions: toNumberOrZero(form.other_deductions),
      gross_total: totals.gross_total,
      total_deductions: totals.total_deductions,
      net_total: totals.net_total,
      status: form.status,
      pdf_path: null,
      notes: form.notes.trim() || null,
      created_by: null,
      approved_by: null,
      approved_at: null,
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        await updatePayroll(id, payload)
        toast({ title: "Guardado", description: "Vencimento atualizado" })
      } else {
        await createPayroll(payload)
        toast({ title: "Criado", description: "Vencimento criado" })
      }
      navigate("/hr/payrolls")
    } catch {
      toast({ title: "Erro", description: "Não foi possível guardar vencimento", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Recursos Humanos → Vencimentos</p>
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
            <p className="page-subtitle">Recursos Humanos → Holerites</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/hr/payrolls">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="payroll-form" disabled={saving}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="payroll-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Informações do Vencimento</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              <label className="text-sm font-medium">Mês de Referência</label>
              <Select value={form.reference_month} onValueChange={(v) => setField("reference_month", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Ano de Referência</label>
              <Select value={form.reference_year} onValueChange={(v) => setField("reference_year", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-2">
              <label className="text-sm font-medium">Estado</label>
              <Select value={String(form.status)} onValueChange={(v) => setField("status", v as PayrollStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Valores Salariais</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Salário Base (€)</label>
              <Input value={form.base_salary} onChange={(e) => setField("base_salary", e.target.value)} placeholder="1450.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Horas Extras (€)</label>
              <Input value={form.overtime_amount} onChange={(e) => setField("overtime_amount", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Horas Extras</label>
              <Input value={form.overtime_hours} onChange={(e) => setField("overtime_hours", e.target.value)} placeholder="0" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Subsídios</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Subsídio de Férias (€)</label>
              <Input value={form.holiday_allowance} onChange={(e) => setField("holiday_allowance", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subsídio de Natal (€)</label>
              <Input value={form.christmas_allowance} onChange={(e) => setField("christmas_allowance", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subsídio de Alimentação (€)</label>
              <Input value={form.meal_allowance} onChange={(e) => setField("meal_allowance", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subsídio de Transporte (€)</label>
              <Input value={form.transport_allowance} onChange={(e) => setField("transport_allowance", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Outros Subsídios (€)</label>
              <Input value={form.other_allowances} onChange={(e) => setField("other_allowances", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Deduções</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Segurança Social (11%) (€)</label>
              <Input value={form.social_security_employee} onChange={(e) => setField("social_security_employee", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Retenção IRS (€)</label>
              <Input value={form.irs_withholding} onChange={(e) => setField("irs_withholding", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Quota Sindical (€)</label>
              <Input value={form.union_fee} onChange={(e) => setField("union_fee", e.target.value)} placeholder="0.00" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Outras Deduções (€)</label>
              <Input value={form.other_deductions} onChange={(e) => setField("other_deductions", e.target.value)} placeholder="0.00" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Totais</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Bruto</label>
              <Input value={money.format(totals.gross_total)} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Deduções</label>
              <Input value={money.format(totals.total_deductions)} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Líquido</label>
              <Input value={money.format(totals.net_total)} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Observações</div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Notas</label>
            <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} rows={3} placeholder="Opcional" />
          </div>
        </div>
      </form>
    </div>
  )
}