import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { MyFormulaCustomer, MyFormulaOrder, MyFormulaOrderStatus, MyFormulaProduct } from "@/types"
import {
  createMyFormulaOrder,
  deleteMyFormulaOrder,
  fetchMyFormulaCustomers,
  fetchMyFormulaOrders,
  fetchMyFormulaOrderStatuses,
  fetchMyFormulaProducts,
  updateMyFormulaOrderStatus,
} from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Orders() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [orders, setOrders] = useState<MyFormulaOrder[]>([])
  const [statuses, setStatuses] = useState<MyFormulaOrderStatus[]>([])
  const [customers, setCustomers] = useState<MyFormulaCustomer[]>([])
  const [products, setProducts] = useState<MyFormulaProduct[]>([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const [createOpen, setCreateOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<MyFormulaOrder | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MyFormulaOrder | null>(null)

  const statusNameById = useMemo(() => {
    const map: Record<string, string> = {}
    statuses.forEach((s) => (map[s.order_status_id] = s.name))
    return map
  }, [statuses])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.order_status_id !== statusFilter) return false
      if (!q) return true
      const hay = `${o.order_id} ${o.firstname} ${o.lastname} ${o.email} ${o.telephone ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [orders, search, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      const [o, s, c, p] = await Promise.all([fetchMyFormulaOrders(), fetchMyFormulaOrderStatuses(), fetchMyFormulaCustomers(), fetchMyFormulaProducts()])
      setOrders(o.data)
      setStatuses(s.data)
      setCustomers(c.data)
      setProducts(p.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar pedidos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const requestDelete = (row: MyFormulaOrder) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMyFormulaOrder(pendingDelete.order_id)
      toast({ title: "Sucesso", description: "Pedido eliminado" })
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
            <h1 className="page-title">Pedidos</h1>
            <p className="page-subtitle">Gestão de encomendas MyFormula</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <Button
            onClick={() => {
              setCreateOpen(true)
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s.order_status_id} value={s.order_status_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Pedido</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Cliente</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Total</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Quiz</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="p-4">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24 mt-2" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-52" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-36" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-9 w-28 ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((o) => {
                    const statusName = statusNameById[o.order_status_id] ?? o.status?.name ?? o.order_status_id
                    const hasQuiz = Boolean(o.quiz)
                    return (
                      <tr key={o.order_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{o.order_id}</div>
                          <div className="text-xs text-muted-foreground">{o.date_added ? new Date(o.date_added).toLocaleString("pt-PT") : "—"}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium">
                            {o.firstname} {o.lastname}
                          </div>
                          <div className="text-xs text-muted-foreground">{o.email}</div>
                        </td>
                        <td className="p-4">{money.format(Number(o.total ?? 0))}</td>
                        <td className="p-4">
                          <span className="text-xs px-2 py-1 rounded-full bg-cyan-500/10 text-cyan-300">{statusName}</span>
                        </td>
                        <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full ${hasQuiz ? "bg-violet-500/10 text-violet-300" : "bg-muted/40 text-muted-foreground"}`}>
                            {hasQuiz ? "Sim" : "Não"}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOrder(o)
                                setStatusOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => requestDelete(o)}>
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

      {createOpen && (
        <CreateOrderModal
          customers={customers}
          products={products}
          statuses={statuses}
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false)
            load()
          }}
        />
      )}

      {statusOpen && editingOrder && (
        <OrderStatusModal
          order={editingOrder}
          statuses={statuses}
          onClose={() => {
            setStatusOpen(false)
            setEditingOrder(null)
          }}
          onSaved={() => {
            setStatusOpen(false)
            setEditingOrder(null)
            load()
          }}
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Eliminar pedido?"
          description={pendingDelete ? `${pendingDelete.order_id} · ${pendingDelete.firstname} ${pendingDelete.lastname}` : ""}
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

function CreateOrderModal({
  customers,
  products,
  statuses,
  onClose,
  onSaved,
}: {
  customers: MyFormulaCustomer[]
  products: MyFormulaProduct[]
  statuses: MyFormulaOrderStatus[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [customerId, setCustomerId] = useState(customers[0]?.customer_id ?? "")
  const [statusId, setStatusId] = useState(statuses[0]?.order_status_id ?? "")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentCode, setPaymentCode] = useState("")
  const [qtyByProductId, setQtyByProductId] = useState<Record<string, number>>({})

  const submit = async () => {
    const items = Object.entries(qtyByProductId)
      .map(([product_id, quantity]) => ({ product_id, quantity: Number(quantity || 0) }))
      .filter((x) => x.quantity > 0)

    if (!customerId) {
      toast({ title: "Validação", description: "Selecione um cliente", variant: "destructive" })
      return
    }
    if (!statusId) {
      toast({ title: "Validação", description: "Selecione um estado", variant: "destructive" })
      return
    }
    if (!items.length) {
      toast({ title: "Validação", description: "Selecione pelo menos um produto com quantidade > 0", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await createMyFormulaOrder({
        customer_id: customerId,
        order_status_id: statusId,
        products: items,
        payment_method: paymentMethod.trim() ? paymentMethod : null,
        payment_code: paymentCode.trim() ? paymentCode : null,
      })
      toast({ title: "Sucesso", description: "Pedido criado" })
      onSaved()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível criar pedido", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Novo pedido</div>
            <div className="text-sm text-muted-foreground">Criação rápida com itens do catálogo.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Cliente</div>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.customer_id} value={c.customer_id}>
                    {c.firstname} {c.lastname} ({c.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Estado</div>
            <Select value={statusId} onValueChange={setStatusId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.order_status_id} value={s.order_status_id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Método de pagamento</div>
            <Input value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} placeholder="Ex: MBWay" />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Código de pagamento</div>
            <Input value={paymentCode} onChange={(e) => setPaymentCode(e.target.value)} placeholder="Ex: mbway" />
          </div>
        </div>

        <div className="mt-6">
          <div className="text-sm font-semibold">Produtos</div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {products.map((p) => {
              const id = p.product_id
              const name = p.description?.name ?? p.model
              const qty = qtyByProductId[id] ?? 0
              return (
                <div key={id} className="rounded-lg border border-border/60 p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.model} · {money.format(Number(p.price ?? 0))}
                    </div>
                  </div>
                  <Input
                    className="w-24"
                    value={String(qty)}
                    inputMode="numeric"
                    onChange={(e) => {
                      const v = Math.max(0, Number(e.target.value || 0))
                      setQtyByProductId((m) => ({ ...m, [id]: v }))
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? "A criar..." : "Criar pedido"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function OrderStatusModal({
  order,
  statuses,
  onClose,
  onSaved,
}: {
  order: MyFormulaOrder
  statuses: MyFormulaOrderStatus[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)
  const [statusId, setStatusId] = useState(order.order_status_id)

  const submit = async () => {
    if (!statusId) return
    setSaving(true)
    try {
      await updateMyFormulaOrderStatus(order.order_id, { order_status_id: statusId })
      toast({ title: "Sucesso", description: "Estado atualizado" })
      onSaved()
    } catch {
      toast({ title: "Erro", description: "Não foi possível atualizar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Editar estado</div>
            <div className="text-sm text-muted-foreground">{order.order_id}</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 space-y-2">
          <div className="text-xs text-muted-foreground">Estado</div>
          <Select value={statusId} onValueChange={setStatusId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {statuses.map((s) => (
                <SelectItem key={s.order_status_id} value={s.order_status_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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