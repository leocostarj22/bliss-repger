import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { MyFormulaProduct } from "@/types"
import { createMyFormulaProduct, deleteMyFormulaProduct, fetchMyFormulaProducts, updateMyFormulaProduct } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { useToast } from "@/components/ui/use-toast"

const money = new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" })

function formatDateAdded(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("pt-PT")
}

export default function Products() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [rows, setRows] = useState<MyFormulaProduct[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MyFormulaProduct | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<MyFormulaProduct | null>(null)

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")

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

  const sorted = useMemo(() => {
    const next = filtered.slice()
    next.sort((a, b) => {
      const da = a.date_added ? new Date(a.date_added).getTime() : 0
      const db = b.date_added ? new Date(b.date_added).getTime() : 0
      return sortDir === "desc" ? db - da : da - db
    })
    return next
  }, [filtered, sortDir])

  const total = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const pageSafe = Math.min(page, totalPages)
  const startIdx = (pageSafe - 1) * perPage
  const endIdx = Math.min(total, startIdx + perPage)
  const pageRows = sorted.slice(startIdx, endIdx)

  const pageItems = useMemo(() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const items: Array<number | "…"> = [1]
    const left = Math.max(2, pageSafe - 1)
    const right = Math.min(totalPages - 1, pageSafe + 1)
    if (left > 2) items.push("…")
    for (let p = left; p <= right; p++) items.push(p)
    if (right < totalPages - 1) items.push("…")
    items.push(totalPages)
    return items
  }, [pageSafe, totalPages])

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
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  <button type="button" className="inline-flex items-center gap-1" onClick={() => setSortDir((d) => d === "desc" ? "asc" : "desc")}>
                    Date added
                    <ChevronDown className={"h-4 w-4 transition-transform " + (sortDir === "asc" ? "rotate-180" : "")} />
                  </button>
                </th>
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
                : pageRows.map((p) => {
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
                        <td className="p-4 text-sm">{formatDateAdded(p.date_added ?? null)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/myformula/products/${p.product_id}/edit`)}
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

      <div className="flex flex-col gap-3 border-t border-border/60 p-4 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {total === 0 ? 0 : startIdx + 1} to {endIdx} of {total} results
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground">Per page</div>
          <div className="w-24">
            <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
              <SelectTrigger>
                <SelectValue placeholder={String(perPage)} />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 50].map((n) => (<SelectItem key={n} value={String(n)}>{n}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Pagination className="md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} />
            </PaginationItem>
            {pageItems.map((it, idx) => it === "…" ? (
              <PaginationItem key={`e-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={it}>
                <PaginationLink href="#" isActive={it === pageSafe} onClick={(e) => { e.preventDefault(); setPage(it) }}>{it}</PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(totalPages, p + 1)) }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
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
  const decodeHtml = (input: string) => {
    if (typeof window === 'undefined') return input
    const txt = document.createElement('textarea')
    txt.innerHTML = input
    return txt.value
  }
  const hasHtml = (input: string) => /<[^>]+>/.test(input)
  const [description, setDescription] = useState(decodeHtml(product?.description?.description ?? ""))
  const [showPreview, setShowPreview] = useState(hasHtml(description))
  const [descriptionMode, setDescriptionMode] = useState<"visual" | "html">("visual")
  const decodedHtml = useMemo(() => decodeHtml(description), [description])
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
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs text-muted-foreground">Descrição</div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant={descriptionMode === "visual" ? "default" : "outline"} onClick={() => setDescriptionMode("visual")}>Editor</Button>
                <Button type="button" size="sm" variant={descriptionMode === "html" ? "default" : "outline"} onClick={() => setDescriptionMode("html")}>HTML</Button>
              </div>
            </div>
            {descriptionMode === "visual" ? (
              <RichTextEditor value={description} onChange={setDescription} placeholder="Descrição do produto..." />
            ) : (
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto..." className="min-h-[220px] font-mono text-xs" />
            )}
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