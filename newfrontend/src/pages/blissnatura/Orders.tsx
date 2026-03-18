import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { BlissCustomer, BlissOrder, BlissOrderStatus, BlissProduct } from "@/types"
import {
  createBlissOrder,
  deleteBlissOrder,
  fetchBlissCustomers,
  fetchBlissOrders,
  fetchBlissOrderStatuses,
  fetchBlissProducts,
  updateBlissOrderStatus,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Orders() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)

  const [orders, setOrders] = useState<BlissOrder[]>([])
  const [statuses, setStatuses] = useState<BlissOrderStatus[]>([])
  const [customers, setCustomers] = useState<BlissCustomer[]>([])
  const [products, setProducts] = useState<BlissProduct[]>([])

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [meta, setMeta] = useState<{ total: number; totalPages: number }>({ total: 0, totalPages: 1 })

  const [createOpen, setCreateOpen] = useState(false)
  const [statusOpen, setStatusOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<BlissOrder | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BlissOrder | null>(null)

  const statusNameById = useMemo(() => {
    const map: Record<string, string> = {}
    statuses.forEach((s) => (map[s.order_status_id] = s.name))
    return map
  }, [statuses])

  const filtered = useMemo(() => orders, [orders])

  const load = async () => {
    setLoading(true)
    try {
      const [o, s, c, p] = await Promise.all([
        fetchBlissOrders({ page, per_page: perPage, search, status_id: statusFilter === 'all' ? undefined : statusFilter, include_unknown: false, dedup: true }),
        fetchBlissOrderStatuses(),
        fetchBlissCustomers({ search: "", status: "all" }),
        fetchBlissProducts({ search: "", status: "all" }),
      ])
      setOrders(o.data)
      setStatuses(s.data)
      setCustomers(c.data)
      setProducts(p.data)
      setMeta({ total: Number((o as any).meta?.total ?? 0), totalPages: Number((o as any).meta?.totalPages ?? 1) })
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar pedidos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, perPage, search, statusFilter])

  const requestDelete = (row: BlissOrder) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteBlissOrder(pendingDelete.order_id)
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
            <p className="page-subtitle">Gestão de encomendas</p>
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
      <div className="mt-4">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} />
            </PaginationItem>
            <PaginationItem>
              <span className="text-xs text-muted-foreground px-2">Página {page} de {meta.totalPages}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(meta.totalPages || 1, p + 1)) }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => { setPage(1); setSearch(e.target.value) }} placeholder="Pesquisar..." className="pl-9" />
          </div>

          <Select value={statusFilter} onValueChange={(v) => { setPage(1); setStatusFilter(v) }}>
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

          <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n} por página</SelectItem>))}
            </SelectContent>
          </Select>

          <div className="flex justify-end">
            <Button variant="outline" onClick={load} disabled={loading}>
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Pedido</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Total</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-[160px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((o) => {
                  const statusName = o.status?.name ?? statusNameById[o.order_status_id] ?? o.order_status_id
                  return (
                    <tr key={o.order_id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="font-medium">{o.order_id}</div>
                        <div className="text-xs text-muted-foreground">{o.date_added ? new Date(o.date_added).toLocaleString("pt-PT") : "—"}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{o.firstname} {o.lastname}</div>
                        <div className="text-xs text-muted-foreground">{o.email}</div>
                      </td>
                      <td className="p-3">{money.format(Number(o.total ?? 0))}</td>
                      <td className="p-3">{statusName}</td>
                      <td className="p-3">
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
                          <Button size="sm" variant="destructive" onClick={() => requestDelete(o)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                    Sem resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar pedido?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar o pedido “${pendingDelete.order_id}”?` : "Deseja eliminar este pedido?"}
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

function CreateOrderModal({
  customers,
  products,
  statuses,
  onClose,
  onSaved,
}: {
  customers: BlissCustomer[]
  products: BlissProduct[]
  statuses: BlissOrderStatus[]
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [customerId, setCustomerId] = useState(customers[0]?.customer_id ?? "")
  const [statusId, setStatusId] = useState(statuses[0]?.order_status_id ?? "")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [shippingMethod, setShippingMethod] = useState("")

  const [qtyByProductId, setQtyByProductId] = useState<Record<string, number>>({})

  const items = useMemo(() => {
    return Object.entries(qtyByProductId)
      .filter(([, q]) => q > 0)
      .map(([product_id, quantity]) => ({ product_id, quantity }))
  }, [qtyByProductId])

  const submit = async () => {
    if (!customerId) {
      toast({ title: "Erro", description: "Selecione um cliente", variant: "destructive" })
      return
    }
    if (!statusId) {
      toast({ title: "Erro", description: "Selecione um estado", variant: "destructive" })
      return
    }
    if (!items.length) {
      toast({ title: "Erro", description: "Adicione pelo menos um produto", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await createBlissOrder({
        customer_id: customerId,
        order_status_id: statusId,
        products: items,
        payment_method: paymentMethod.trim() ? paymentMethod : null,
        shipping_method: shippingMethod.trim() ? shippingMethod : null,
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
            <div className="text-xs text-muted-foreground">Método de envio</div>
            <Input value={shippingMethod} onChange={(e) => setShippingMethod(e.target.value)} placeholder="Ex: CTT Expresso" />
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
  order: BlissOrder
  statuses: BlissOrderStatus[]
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
      await updateBlissOrderStatus(order.order_id, { order_status_id: statusId })
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