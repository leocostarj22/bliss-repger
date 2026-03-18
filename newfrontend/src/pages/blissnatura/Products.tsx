import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { BlissProduct } from "@/types"
import { createBlissProduct, deleteBlissProduct, fetchBlissProducts, updateBlissProduct } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

export default function Products() {
  const { toast } = useToast()
  const [rows, setRows] = useState<BlissProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BlissProduct | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BlissProduct | null>(null)

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
      const hay = `${p.product_id} ${p.model} ${name}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter])

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchBlissProducts({ search: "", status: "all" })
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

  const requestDelete = (row: BlissProduct) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteBlissProduct(pendingDelete.product_id)
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
            <p className="page-subtitle">Catálogo Bliss Natura</p>
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
          <div className="relative">
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
                <th className="p-3">Nome</th>
                <th className="p-3">Modelo</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-[140px]"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </td>
                  </tr>
                ))
              ) : filtered.length ? (
                filtered.map((p) => {
                  const active = Boolean(p.status ?? true)
                  return (
                    <tr key={p.product_id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.image_url || undefined} alt={p.description?.name ?? p.model} />
                            <AvatarFallback>{(p.description?.name?.[0] ?? p.model?.[0] ?? '#').toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{p.description?.name ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{p.product_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{p.model}</td>
                      <td className="p-3">{money.format(Number(p.price ?? 0))}</td>
                      <td className="p-3">{p.quantity ?? 0}</td>
                      <td className="p-3">
                        <span className={active ? "text-emerald-400" : "text-muted-foreground"}>{active ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td className="p-3">
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
                          <Button size="sm" variant="destructive" onClick={() => requestDelete(p)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                    Sem resultados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {formOpen && (
        <ProductFormModal
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
              <div className="text-lg font-semibold">Eliminar produto?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.description?.name ?? pendingDelete.model}”?` : "Deseja eliminar este produto?"}
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

function ProductFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: BlissProduct | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(editing?.description?.name ?? "")
  const [model, setModel] = useState(editing?.model ?? "")
  const decodeHtml = (input: string) => {
    if (typeof window === 'undefined') return input;
    const txt = document.createElement('textarea');
    txt.innerHTML = input;
    return txt.value;
  }
  const hasHtml = (input: string) => /<[^>]+>/.test(input);
  const [description, setDescription] = useState(decodeHtml(editing?.description?.description ?? ""))
  const [price, setPrice] = useState(String(editing?.price ?? ""))
  const [quantity, setQuantity] = useState(String(editing?.quantity ?? ""))
  const [isActive, setIsActive] = useState(editing ? Boolean(editing.status ?? true) : true)
  const [imageUrl, setImageUrl] = useState(editing?.image_url ?? "")
  const [showPreview, setShowPreview] = useState(hasHtml(description))
  const decodedHtml = useMemo(() => decodeHtml(description), [description])

  const submit = async () => {
    if (!model.trim()) {
      toast({ title: "Erro", description: "Modelo é obrigatório", variant: "destructive" })
      return
    }
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const nPrice = price.trim() ? Number(price) : null
      const nQty = quantity.trim() ? Number(quantity) : null

      if (editing) {
        await updateBlissProduct(editing.product_id, {
          model,
          name,
          description: description.trim() ? description : null,
          price: nPrice,
          quantity: nQty,
          status: isActive,
          image_url: imageUrl.trim() ? imageUrl : null,
        })
        toast({ title: "Sucesso", description: "Produto atualizado" })
      } else {
        await createBlissProduct({
          model,
          name,
          description: description.trim() ? description : null,
          price: nPrice,
          quantity: nQty,
          status: isActive,
          image_url: imageUrl.trim() ? imageUrl : null,
        })
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
      <div className="glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{editing ? "Editar produto" : "Novo produto"}</div>
            <div className="text-sm text-muted-foreground">Campos baseados nos models/resources do Filament.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Creme Hidratante" />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Modelo</div>
            <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: BN-001" />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Preço</div>
            <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="Ex: 19.90" />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Quantidade</div>
            <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" placeholder="Ex: 10" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Imagem (URL)</div>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Descrição</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto..." />
            <div className="flex items-center justify-end gap-2">
              <span className="text-xs text-muted-foreground">Pré-visualizar</span>
              <Switch checked={showPreview} onCheckedChange={setShowPreview} />
            </div>
            {showPreview && (
              <div className="mt-2 p-3 rounded-md border bg-background">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: decodedHtml }} />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between md:col-span-2">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Ativo</div>
              <div className="text-sm">{isActive ? "Sim" : "Não"}</div>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
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