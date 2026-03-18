import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Company, FinanceBankAccount, FinanceCategory, FinanceCostCenter, FinanceTransaction } from "@/types"
import { fetchCompanies } from "@/services/api"
import {
  createFinanceTransaction,
  deleteFinanceTransaction,
  fetchFinanceBankAccounts,
  fetchFinanceCategories,
  fetchFinanceCostCenters,
  fetchFinanceTransactions,
  updateFinanceTransaction,
} from "@/services/financeApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const money = (value: number, currency = "EUR") =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency }).format(value || 0)

export default function FinanceTransactions() {
  const { toast } = useToast()
  const [rows, setRows] = useState<FinanceTransaction[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [categories, setCategories] = useState<FinanceCategory[]>([])
  const [costCenters, setCostCenters] = useState<FinanceCostCenter[]>([])
  const [bankAccounts, setBankAccounts] = useState<FinanceBankAccount[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all")
  const [statusFilter, setStatusFilter] = useState<"all" | FinanceTransaction["status"]>("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceTransaction | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<FinanceTransaction | null>(null)

  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {}
    categories.forEach((c) => (map[c.id] = c.name))
    return map
  }, [categories])

  const costCenterNameById = useMemo(() => {
    const map: Record<string, string> = {}
    costCenters.forEach((c) => (map[c.id] = c.name))
    return map
  }, [costCenters])

  const bankAccountNameById = useMemo(() => {
    const map: Record<string, string> = {}
    bankAccounts.forEach((b) => (map[b.id] = b.name))
    return map
  }, [bankAccounts])

  const bankCurrencyById = useMemo(() => {
    const map: Record<string, string> = {}
    bankAccounts.forEach((b) => (map[b.id] = b.currency))
    return map
  }, [bankAccounts])

  const load = async () => {
    setLoading(true)
    try {
      const [txResp, comps, catResp, ccResp, baResp] = await Promise.all([
        fetchFinanceTransactions({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
          type: typeFilter === "all" ? undefined : typeFilter,
          status: statusFilter === "all" ? undefined : statusFilter,
        }),
        fetchCompanies(),
        fetchFinanceCategories({ company_id: companyFilter === "all" ? undefined : companyFilter }),
        fetchFinanceCostCenters({ company_id: companyFilter === "all" ? undefined : companyFilter }),
        fetchFinanceBankAccounts({ company_id: companyFilter === "all" ? undefined : companyFilter }),
      ])

      setRows(txResp.data)
      setCompanies(comps.data)
      setCategories(catResp.data)
      setCostCenters(ccResp.data)
      setBankAccounts(baResp.data)
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
  }, [search, companyFilter, typeFilter, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (row: FinanceTransaction) => {
    setEditing(row)
    setFormOpen(true)
  }

  const requestDelete = (row: FinanceTransaction) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const row = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!row) return

    try {
      await deleteFinanceTransaction(row.id)
      toast({ title: "Sucesso", description: "Lançamento eliminado" })
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
            <h1 className="page-title">Lançamentos</h1>
            <p className="page-subtitle">Financeiro → Lançamentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={openCreate}>
            <Plus />
            Novo lançamento
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
              placeholder="Pesquisar por descrição/notas…"
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

          <div className="w-full lg:w-[200px]">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[200px]">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="late">Em atraso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Descrição</th>
                <th className="py-3 pr-4">Tipo</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 pr-4">Venc.</th>
                <th className="py-3 pr-4">Valor</th>
                <th className="py-3 pr-4">Categoria</th>
                <th className="py-3 pr-4">Centro</th>
                <th className="py-3 pr-4">Conta</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-56" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-muted-foreground">
                    Nenhum lançamento encontrado
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const currency = r.bank_account_id ? bankCurrencyById[r.bank_account_id] : "EUR"
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="font-medium">{r.description}</div>
                        {r.notes ? <div className="text-xs text-muted-foreground line-clamp-1">{r.notes}</div> : null}
                      </td>
                      <td className="py-4 pr-4">{r.type === "income" ? "Receita" : "Despesa"}</td>
                      <td className="py-4 pr-4">{r.status}</td>
                      <td className="py-4 pr-4">{r.due_date ? new Date(r.due_date).toLocaleDateString("pt-PT") : "—"}</td>
                      <td className="py-4 pr-4">{money(r.amount, currency)}</td>
                      <td className="py-4 pr-4">{r.category_id ? categoryNameById[r.category_id] ?? r.category_id : "—"}</td>
                      <td className="py-4 pr-4">
                        {r.cost_center_id ? costCenterNameById[r.cost_center_id] ?? r.cost_center_id : "—"}
                      </td>
                      <td className="py-4 pr-4">
                        {r.bank_account_id ? bankAccountNameById[r.bank_account_id] ?? r.bank_account_id : "—"}
                      </td>
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <TransactionFormModal
          companies={companies}
          categories={categories}
          costCenters={costCenters}
          bankAccounts={bankAccounts}
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
              <div className="text-lg font-semibold">Eliminar lançamento?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.description}”?` : "Deseja eliminar este lançamento?"}
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

function TransactionFormModal({
  companies,
  categories,
  costCenters,
  bankAccounts,
  editing,
  onClose,
  onSaved,
}: {
  companies: Company[]
  categories: FinanceCategory[]
  costCenters: FinanceCostCenter[]
  bankAccounts: FinanceBankAccount[]
  editing: FinanceTransaction | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [companyId, setCompanyId] = useState<string>(editing?.company_id ?? (companies[0]?.id ?? ""))
  const [type, setType] = useState<"income" | "expense">(editing?.type ?? "income")
  const [status, setStatus] = useState<FinanceTransaction["status"]>(editing?.status ?? "pending")
  const [description, setDescription] = useState(editing?.description ?? "")
  const [amount, setAmount] = useState(String(editing?.amount ?? 0))
  const [dueDate, setDueDate] = useState(editing?.due_date ? editing.due_date.slice(0, 10) : "")
  const [paidAt, setPaidAt] = useState(editing?.paid_at ? editing.paid_at.slice(0, 10) : "")
  const [notes, setNotes] = useState(editing?.notes ?? "")

  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "none")
  const [costCenterId, setCostCenterId] = useState<string>(editing?.cost_center_id ?? "none")
  const [bankAccountId, setBankAccountId] = useState<string>(editing?.bank_account_id ?? "none")

  const categoriesForSelect = useMemo(
    () => categories.filter((c) => c.company_id === companyId && c.type === type && c.is_active),
    [categories, companyId, type],
  )
  const costCentersForSelect = useMemo(
    () => costCenters.filter((c) => c.company_id === companyId),
    [costCenters, companyId],
  )
  const bankAccountsForSelect = useMemo(
    () => bankAccounts.filter((b) => b.company_id === companyId && b.is_active),
    [bankAccounts, companyId],
  )

  useEffect(() => {
    if (categoryId !== "none" && !categoriesForSelect.some((c) => c.id === categoryId)) setCategoryId("none")
  }, [categoriesForSelect, categoryId])

  useEffect(() => {
    if (costCenterId !== "none" && !costCentersForSelect.some((c) => c.id === costCenterId)) setCostCenterId("none")
  }, [costCentersForSelect, costCenterId])

  useEffect(() => {
    if (bankAccountId !== "none" && !bankAccountsForSelect.some((b) => b.id === bankAccountId)) setBankAccountId("none")
  }, [bankAccountsForSelect, bankAccountId])

  const submit = async () => {
    if (!companyId) {
      toast({ title: "Erro", description: "Selecione uma empresa", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        company_id: companyId,
        type,
        status,
        description,
        amount: Number(amount),
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        paid_at: paidAt ? new Date(paidAt).toISOString() : null,
        notes: notes.trim() ? notes : null,
        category_id: categoryId === "none" ? null : categoryId,
        cost_center_id: costCenterId === "none" ? null : costCenterId,
        bank_account_id: bankAccountId === "none" ? null : bankAccountId,
        payer_type: null,
        payer_id: null,
        reference_type: null,
        reference_id: null,
      } satisfies Omit<FinanceTransaction, "id" | "createdAt" | "updatedAt">

      if (editing) {
        await updateFinanceTransaction(editing.id, payload)
        toast({ title: "Sucesso", description: "Lançamento atualizado" })
      } else {
        await createFinanceTransaction(payload)
        toast({ title: "Sucesso", description: "Lançamento criado" })
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
      <div className="glass-card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div>
          <div className="text-lg font-semibold">{editing ? "Editar lançamento" : "Novo lançamento"}</div>
          <div className="text-sm text-muted-foreground">Registo de receita/despesa</div>
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

          <div>
            <div className="text-xs text-muted-foreground mb-1">Tipo</div>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="income">Receita</SelectItem>
                <SelectItem value="expense">Despesa</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Estado</div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="late">Em atraso</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Descrição</div>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Fatura #..." />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Valor</div>
            <Input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" step="0.01" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Conta bancária</div>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="(opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Sem conta)</SelectItem>
                {bankAccountsForSelect.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} ({b.currency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Categoria</div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="(opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Sem categoria)</SelectItem>
                {categoriesForSelect.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Centro de custo</div>
            <Select value={costCenterId} onValueChange={setCostCenterId}>
              <SelectTrigger>
                <SelectValue placeholder="(opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">(Sem centro)</SelectItem>
                {costCentersForSelect.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Vencimento</div>
            <Input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Pago em</div>
            <Input value={paidAt} onChange={(e) => setPaidAt(e.target.value)} type="date" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Notas</div>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="(opcional)" />
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