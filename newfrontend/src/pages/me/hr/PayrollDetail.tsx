import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ExternalLink } from "lucide-react"

import type { Employee, Payroll, PayrollStatus } from "@/types"
import { fetchMyEmployee, fetchPayroll } from "@/services/api"
import { resolvePhotoUrl } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

const statusLabel = (s: PayrollStatus) => {
  if (s === "draft") return "Rascunho"
  if (s === "approved") return "Aprovado"
  if (s === "paid") return "Pago"
  return "Cancelado"
}

const monthLabel = (m: number) =>
  (
    {
      1: "Janeiro",
      2: "Fevereiro",
      3: "Março",
      4: "Abril",
      5: "Maio",
      6: "Junho",
      7: "Julho",
      8: "Agosto",
      9: "Setembro",
      10: "Outubro",
      11: "Novembro",
      12: "Dezembro",
    } as const
  )[m as 1] ?? String(m)

export default function PayrollDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [myEmployee, setMyEmployee] = useState<Employee | null>(null)
  const [payroll, setPayroll] = useState<Payroll | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)

    if (!id) {
      setLoading(false)
      return
    }

    fetchMyEmployee()
      .then(async (me) => {
        if (!alive) return
        setMyEmployee(me.data)

        const p = await fetchPayroll(id)
        if (!alive) return

        if (String(p.data.employee_id) !== String(me.data.id)) {
          toast({ title: "Acesso restrito", description: "Este vencimento não pertence ao teu utilizador.", variant: "destructive" })
          navigate("/me/hr/payrolls", { replace: true })
          return
        }

        setPayroll(p.data)
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar vencimento", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [id, navigate, toast])

  const pdfUrl = useMemo(() => resolvePhotoUrl(payroll?.pdf_path ?? null) ?? null, [payroll?.pdf_path])

  const onOpenPdf = () => {
    if (!pdfUrl) return
    window.open(pdfUrl, "_blank", "noopener,noreferrer")
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Vencimento</h1>
          <p className="page-subtitle">Meu RH → Vencimentos</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  if (!payroll) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">Holerite</h1>
          <p className="page-subtitle">Meu RH → Holerites</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">Vencimento não encontrado.</div>
          <div className="mt-4">
            <Button variant="outline" asChild>
              <Link to="/me/hr/payrolls">Voltar</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const status = (payroll.status ?? "draft") as PayrollStatus
  const period = `${monthLabel(payroll.reference_month)} / ${payroll.reference_year}`

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Vencimento</h1>
            <p className="page-subtitle">Meu RH → Vencimentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/me/hr/payrolls">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>

            {pdfUrl ? (
              <Button onClick={onOpenPdf}>
                <ExternalLink />
                Abrir PDF
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Resumo</div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Colaborador</label>
              <Input value={myEmployee?.name ?? ""} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <Input value={period} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Input value={statusLabel(status)} disabled />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bruto</label>
              <Input value={money.format(payroll.gross_total ?? 0)} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descontos</label>
              <Input value={money.format(payroll.total_deductions ?? 0)} disabled />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Líquido</label>
              <Input value={money.format(payroll.net_total ?? 0)} disabled />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Notas</div>
          <div className="mt-4 space-y-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={String(payroll.notes ?? "")} rows={4} disabled />
          </div>
        </div>
      </div>
    </div>
  )
}