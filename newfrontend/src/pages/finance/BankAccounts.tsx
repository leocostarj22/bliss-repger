import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Company, FinanceBankAccount } from "@/types"
import { fetchCompanies } from "@/services/api"
import {
  createFinanceBankAccount,
  deleteFinanceBankAccount,
  fetchFinanceBankAccounts,
  updateFinanceBankAccount,
} from "@/services/financeApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const money = (value: number, currency: string) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value || 0)

export default function BankAccounts() {
  const { toast } = useToast()
  const [rows, setRows] = useState<FinanceBankAccount[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceBankAccount | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FinanceBankAccount | null>(null)

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => (map[c.id] = c.name))
    return map
  }, [companies])

  const load = async () => {
    setLoading(true)
    const is_active = activeFilter === "all" ? undefined : activeFilter === "active"
    try {
      const [resp, comps] = await Promise.all([
        fetchFinanceBankAccounts({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
          is_active,
        }),
        fetchCompanies(),
      ])
      setRows(resp.data)
      setCompanies(comps.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, companyFilter, activeFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: FinanceBankAccount) => {
    setEditing(row)
    setFormOpen(true)
  }

  const requestDelete = (row: FinanceBankAccount) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deleteFinanceBankAccount(row.id)
      toast({ title: "Sucesso", description: "Conta eliminada" })
      load()
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Contas Bancárias</h1>
            <p className="page-subtitle">Financeiro → Contas Bancárias</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate}>
            <Plus />
            Nova conta
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, banco, nº conta…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[240px]">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[180px]">
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Conta</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Moeda</th>
                <th className="py-3 pr-4">Saldo</th>
                <th className="py-3 pr-4">Ativa</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-52" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhuma conta encontrada
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.bank_name} • {r.account_number}
                      </div>
                    </td>
                    <td className="py-4 pr-4">{companyNameById[r.company_id] ?? r.company_id}</td>
                    <td className="py-4 pr-4">{r.currency}</td>
                    <td className="py-4 pr-4">{money(r.current_balance, r.currency)}</td>
                    <td className="py-4 pr-4">{r.is_active ? "Sim" : "Não"}</td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(r)}>
                          <Pencil />
                          Editar
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(r)}>
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <BankAccountFormModal
          companies={companies}
          editing={editing}
          onClose={() => {
            setFormOpen(false)
            setEditing(null)
          }}
          onSaved={() => {
            setFormOpen(false)
            setEditing(null)
            load()
          }}
        />
      )}

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar conta?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.name}”?` : "Deseja eliminar esta conta?"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false)
                  setPendingDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BankAccountFormModal({
  companies,
  editing,
  onClose,
  onSaved,
}: {
  companies: Company[]
  editing: FinanceBankAccount | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [companyId, setCompanyId] = useState<string>(editing?.company_id ?? (companies[0]?.id ?? ""))
  const [name, setName] = useState(editing?.name ?? "")
  const [bankName, setBankName] = useState(editing?.bank_name ?? "")
  const [accountNumber, setAccountNumber] = useState(editing?.account_number ?? "")
  const [currency, setCurrency] = useState(editing?.currency ?? "EUR")
  const [initialBalance, setInitialBalance] = useState(String(editing?.initial_balance ?? 0))
  const [currentBalance, setCurrentBalance] = useState(String(editing?.current_balance ?? (editing?.initial_balance ?? 0)))
  const [isActive, setIsActive] = useState(editing ? Boolean(editing.is_active) : true)

  useEffect(() => {
    if (!editing) setCurrentBalance(initialBalance)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBalance])

  const submit = async () => {
    if (!companyId) {
      toast({ title: "Erro", description: "Selecione uma empresa", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateFinanceBankAccount(editing.id, {
          company_id: companyId,
          name,
          bank_name: bankName,
          account_number: accountNumber,
          currency,
          initial_balance: Number(initialBalance),
          current_balance: Number(currentBalance),
          is_active: isActive,
        })
        toast({ title: "Sucesso", description: "Conta atualizada" })
      } else {
        await createFinanceBankAccount({
          company_id: companyId,
          name,
          bank_name: bankName,
          account_number: accountNumber,
          currency,
          initial_balance: Number(initialBalance),
          current_balance: Number(currentBalance),
          is_active: isActive,
        })
        toast({ title: "Sucesso", description: "Conta criada" })
      }
      onSaved()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{editing ? "Editar conta" : "Nova conta"}</div>
            <div className="text-sm text-muted-foreground">Dados da conta bancária</div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
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

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Conta Principal" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Banco</div>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ex.: Millennium" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Nº Conta</div>
            <Input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Ex.: PT50 …"
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Moeda</div>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="EUR" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Ativa</div>
            <Select value={isActive ? "1" : "0"} onValueChange={(v) => setIsActive(v === "1")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Sim</SelectItem>
                <SelectItem value="0">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Saldo Inicial</div>
            <Input value={initialBalance} onChange={(e) => setInitialBalance(e.target.value)} type="number" step="0.01" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Saldo Atual</div>
            <Input value={currentBalance} onChange={(e) => setCurrentBalance(e.target.value)} type="number" step="0.01" />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={saving}>
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}