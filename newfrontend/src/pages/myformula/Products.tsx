import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { MyFormulaProduct } from "@/types"
import { createMyFormulaProduct, deleteMyFormulaProduct, fetchMyFormulaProducts, updateMyFormulaProduct } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Products() {
  const { toast } = useToast()
  const [rows, setRows] = useState<MyFormulaProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MyFormulaProduct | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MyFormulaProduct | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((p) => {
      if (statusFilter !== "all") {
        const active = Boolean(p.status ?? true)
        if (statusFilter === "active" && !active) return false
        if (statusFilter === "inactive" && active) return false
      }
      if (!q) return true
      const name = p.description?.name ?? ""
      const hay = `${p.product_id} ${p.model} ${p.sku ?? ""} ${name}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchMyFormulaProducts({ search: "", status: "all" })
      setRows(resp.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar produtos", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const requestDelete = (row: MyFormulaProduct) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteMyFormulaProduct(pendingDelete.product_id)
      toast({ title: "Sucesso", description: "Produto eliminado" })
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
            <h1 className="page-title">Produtos</h1>
            <p className="page-subtitle">Catálogo MyFormula</p>
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
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Produto</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Preço</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Stock</th>
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
                        <Skeleton className="h-5 w-24" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-16" />
                      </td>
                      <td className="p-4">
                        <Skeleton className="h-5 w-20" />
                      </td>
                      <td className="p-4 text-right">
                        <Skeleton className="h-9 w-24 ml-auto" />
                      </td>
                    </tr>
                  ))
                : filtered.map((p) => {
                    const active = Boolean(p.status ?? true)
                    const name = p.description?.name ?? p.model
                    return (
                      <tr key={p.product_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.product_id} · {p.model}
                            {p.sku ? ` · ${p.sku}` : ""}
                          </div>
                        </td>
                        <td className="p-4">{money.format(Number(p.price ?? 0))}</td>
                        <td className="p-4">{Number(p.quantity ?? 0)}</td>
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
                                setEditing(p)
                                setFormOpen(true)
                              }}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => requestDelete(p)}>
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
        <ProductForm
          product={editing}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false)
            load()
          }}
        />
      )}

      {deleteOpen && (
        <ConfirmModal
          title="Eliminar produto?"
          description={pendingDelete ? `${pendingDelete.description?.name ?? pendingDelete.model} (${pendingDelete.product_id})` : ""}
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

function ProductForm({
  product,
  onClose,
  onSaved,
}: {
  product: MyFormulaProduct | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [model, setModel] = useState(product?.model ?? "")
  const [sku, setSku] = useState(product?.sku ?? "")
  const [name, setName] = useState(product?.description?.name ?? "")
  const [description, setDescription] = useState(product?.description?.description ?? "")
  const [price, setPrice] = useState(String(product?.price ?? 0))
  const [quantity, setQuantity] = useState(String(product?.quantity ?? 0))
  const [status, setStatus] = useState(Boolean(product?.status ?? true))

  const submit = async () => {
    if (!model.trim()) {
      toast({ title: "Validação", description: "O campo Modelo é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const payload = {
        model: model.trim(),
        sku: sku.trim() ? sku.trim() : null,
        name: name.trim() ? name.trim() : null,
        description: description.trim() ? description.trim() : null,
        price: Number(price || 0),
        quantity: Number(quantity || 0),
        status,
      }

      if (product) {
        await updateMyFormulaProduct(product.product_id, payload)
        toast({ title: "Sucesso", description: "Produto atualizado" })
      } else {
        await createMyFormulaProduct(payload)
        toast({ title: "Sucesso", description: "Produto criado" })
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
            <div className="text-lg font-semibold">{product ? "Editar produto" : "Novo produto"}</div>
            <div className="text-sm text-muted-foreground">Campos principais do catálogo.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Modelo</div>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: MF-001" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">SKU</div>
            <Input value={sku ?? ""} onChange={(e) => setSku(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome público" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Descrição</div>
            <Textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Preço (€)</div>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
          </div>
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Quantidade</div>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3 md:col-span-2">
            <div>
              <div className="font-medium">Ativo</div>
              <div className="text-xs text-muted-foreground">Disponível para venda</div>
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