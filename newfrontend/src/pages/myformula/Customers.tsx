import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { MyFormulaCustomer } from "@/types"
import { createMyFormulaCustomer, deleteMyFormulaCustomer, fetchMyFormulaCustomers, updateMyFormulaCustomer } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function Customers() {
  const { toast } = useToast()
  const [rows, setRows] = useState<MyFormulaCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MyFormulaCustomer | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MyFormulaCustomer | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((c) => {
      if (statusFilter !== "all") {
        const active = Boolean(c.status ?? true)
        if (statusFilter === "active" && !active) return false
        if (statusFilter === "inactive" && active) return false
      }
      if (!q) return true
      const hay = `${c.customer_id} ${c.firstname} ${c.lastname} ${c.email} ${c.telephone ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchMyFormulaCustomers({ search: "", status: "all" })
      setRows(resp.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar clientes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const requestDelete = (row: MyFormulaCustomer) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMyFormulaCustomer(pendingDelete.customer_id)
      toast({ title: "Sucesso", description: "Cliente eliminado" })
      setDeleteOpen(false)
      setPendingDelete(null)
      load()
    } catch {
      toast({ title: "Erro", description: "Não foi possível eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Clientes</h1>
            <p className="page-subtitle">Base de clientes MyFormula</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Contacto</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="p-4">
                        <Skeleton className="h-5 w-56" />
                        <Skeleton className="h-4 w-40 mt-2" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-40" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-9 w-24 ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((c) => {
                    const active = Boolean(c.status ?? true)
                    return (
                      <tr key={c.customer_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">
                            {c.firstname} {c.lastname}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.customer_id}</div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{c.email}</div>
                          <div className="text-xs text-muted-foreground">{c.telephone ?? "—"}</div>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${active ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>
                            {active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditing(c)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => requestDelete(c)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {!loading && !filtered.length && <div className="p-6 text-sm text-muted-foreground">Sem resultados.</div>}
      </div>

      {formOpen && (
        <CustomerForm
          customer={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Eliminar cliente?"
          description={pendingDelete ? `${pendingDelete.firstname} ${pendingDelete.lastname} (${pendingDelete.email})` : ""}
          onClose={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  )
}

function CustomerForm({
  customer,
  onClose,
  onSaved,
}: {
  customer: MyFormulaCustomer | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [firstname, setFirstname] = useState(customer?.firstname ?? "")
  const [lastname, setLastname] = useState(customer?.lastname ?? "")
  const [email, setEmail] = useState(customer?.email ?? "")
  const [telephone, setTelephone] = useState(customer?.telephone ?? "")
  const [status, setStatus] = useState(Boolean(customer?.status ?? true))

  const submit = async () => {
    if (!firstname.trim() || !lastname.trim() || !email.trim()) {
      toast({ title: "Validação", description: "Nome e email são obrigatórios", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim(),
        telephone: telephone.trim() ? telephone.trim() : null,
        status,
      }

      if (customer) {
        await updateMyFormulaCustomer(customer.customer_id, payload)
        toast({ title: "Sucesso", description: "Cliente atualizado" })
      } else {
        await createMyFormulaCustomer(payload)
        toast({ title: "Sucesso", description: "Cliente criado" })
      }

      onSaved()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{customer ? "Editar cliente" : "Novo cliente"}</div>
            <div className="text-sm text-muted-foreground">Dados básicos de contacto.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Nome</div>
            <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} placeholder="Primeiro nome" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Apelido</div>
            <Input value={lastname} onChange={(e) => setLastname(e.target.value)} placeholder="Último nome" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@dominio.com" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Telefone</div>
            <Input value={telephone ?? ""} onChange={(e) => setTelephone(e.target.value)} placeholder="Opcional" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
            <div>
              <div className="font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Pode efetuar encomendas</div>
            </div>
            <Switch checked={status} onCheckedChange={setStatus} />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({
  title,
  description,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-lg font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground mt-2">{description}</div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </div>
      </div>
    </div>
  )
}