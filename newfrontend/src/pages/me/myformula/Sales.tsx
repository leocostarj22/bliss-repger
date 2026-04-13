import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { fetchMyAccess, fetchMyCompanies } from "@/services/api"
import { createMyFormulaCustomerReal } from "@/services/myFormulaApi"
import type { MyFormulaCustomer } from "@/types"

export default function MyFormulaSales() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [allowed, setAllowed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const [firstname, setFirstname] = useState("")
  const [lastname, setLastname] = useState("")
  const [telephone, setTelephone] = useState("")
  const [email, setEmail] = useState("")
  const [nif, setNif] = useState("")

  const [customer, setCustomer] = useState<MyFormulaCustomer | null>(null)

  const isReadyToCreate = useMemo(() => telephone.trim().length > 0 && !busy, [telephone, busy])

  useEffect(() => {
    let alive = true
    setAllowed(null)

    Promise.allSettled([fetchMyAccess(), fetchMyCompanies()])
      .then(([accessRes, companiesRes]) => {
        if (!alive) return
        const isAdmin = accessRes.status === "fulfilled" ? Boolean(accessRes.value.data.isAdmin) : false
        if (isAdmin) {
          setAllowed(true)
          return
        }

        const isEmployeeRole = accessRes.status === "fulfilled" ? Boolean(accessRes.value.data.isEmployeeRole) : false
        if (!isEmployeeRole) {
          setAllowed(false)
          return
        }

        const companies = companiesRes.status === "fulfilled" ? companiesRes.value.data : []
        const ok = Array.isArray(companies) && companies.some((c) => String((c as any)?.slug ?? "").toLowerCase() === "myformula")
        setAllowed(ok)
      })
      .catch(() => {
        if (!alive) return
        setAllowed(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const onCreateCustomer = async () => {
    if (!isReadyToCreate) return

    setBusy(true)
    try {
      const res = await createMyFormulaCustomerReal({
        telephone: telephone.trim(),
        firstname: firstname.trim() || null,
        lastname: lastname.trim() || null,
        email: email.trim() || null,
        nif: nif.trim() || null,
      })

      setCustomer(res.data)
      toast({ title: "Cliente criado", description: `ID ${res.data.customer_id}` })
    } catch (e: any) {
      toast({
        title: "Erro",
        description: String(e?.message ?? "Não foi possível criar o cliente"),
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  if (allowed === null) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">A carregar…</h1>
          <p className="page-subtitle">Vendas MyFormula</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card">
          <div className="text-sm text-muted-foreground">A validar acesso…</div>
        </div>
      </div>
    )
  }

  if (!allowed) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Acesso restrito</h1>
          <p className="page-subtitle">Vendas MyFormula</p>
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card space-y-3">
          <div className="text-sm text-muted-foreground">A tua empresa não tem acesso a esta funcionalidade.</div>
          <Button variant="outline" onClick={() => navigate("/")}>Voltar</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Vendas MyFormula</h1>
            <p className="page-subtitle">Call center</p>
            <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
          </div>

          <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="text-sm font-semibold">1) Registo do cliente</div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Telefone (obrigatório)</div>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} placeholder="+351…" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Email (opcional)</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="(se vazio, será gerado automaticamente)" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Nome</div>
            <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Primeiro nome" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Apelido</div>
            <Input value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Último nome" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">NIF (opcional)</div>
            <Input value={nif} onChange={(e) => setNif(e.target.value)} placeholder="(não obrigatório)" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={onCreateCustomer} disabled={!isReadyToCreate}>
            {busy ? "A criar…" : "Criar cliente"}
          </Button>
          {customer ? (
            <div className="text-sm text-muted-foreground">
              Criado: {customer.firstname} {customer.lastname} — {customer.telephone ?? "—"} ({customer.email})
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-6 space-y-2">
        <div className="text-sm font-semibold">2) Quiz do MyFormula</div>
        <div className="text-sm text-muted-foreground">Próximo passo: criar o fluxo de preenchimento do quiz e gravar na BD MyFormula.</div>
      </div>

      <div className="glass-card p-6 space-y-2">
        <div className="text-sm font-semibold">3) Venda (encomenda)</div>
        <div className="text-sm text-muted-foreground">Próximo passo: criar encomenda (oc_order + tabelas relacionadas) na BD MyFormula.</div>
      </div>
    </div>
  )
}