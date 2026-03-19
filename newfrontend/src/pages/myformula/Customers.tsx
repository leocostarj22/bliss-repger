import { useEffect, useMemo, useState } from "react"
import { ChevronDown, Mail, Pencil, Phone, Plus, Search } from "lucide-react"

import type { MyFormulaCustomer } from "@/types"
import { createMyFormulaCustomer, fetchMyFormulaCustomers, updateMyFormulaCustomer } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"

function formatDateAdded(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export default function Customers() {
  const { toast } = useToast()
  const [rows, setRows] = useState<MyFormulaCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [perPage, setPerPage] = useState(10)
  const [page, setPage] = useState(1)
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<MyFormulaCustomer | null>(null)

  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((c) => {
      if (!q) return true
      const hay = `${c.customer_id} ${c.firstname} ${c.lastname} ${c.email} ${c.telephone ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

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
  const paged = sorted.slice(startIdx, endIdx)

  const allOnPageSelected = paged.length > 0 && paged.every((c) => Boolean(selected[c.customer_id]))
  const someOnPageSelected = paged.some((c) => Boolean(selected[c.customer_id])) && !allOnPageSelected

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


  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground">My Formula Customers &nbsp;&rsaquo;&nbsp; List</div>
            <h1 className="page-title">My Formula Customers</h1>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New my formula customer
          </Button>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-end gap-3 border-b border-border/60 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Search"
              className="pl-9"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/60">
                <th className="w-10 p-4">
                  <Checkbox
                    checked={allOnPageSelected || (someOnPageSelected ? "indeterminate" : false)}
                    onCheckedChange={(v) => {
                      const checked = Boolean(v)
                      setSelected((prev) => {
                        const next = { ...prev }
                        for (const c of paged) next[c.customer_id] = checked
                        return next
                      })
                    }}
                    aria-label="Select all"
                  />
                </th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nome</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Email</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Telefone</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1"
                    onClick={() => setSortDir((d) => (d === "desc" ? "asc" : "desc"))}
                  >
                    Date added
                    <ChevronDown className={"h-4 w-4 transition-transform " + (sortDir === "asc" ? "rotate-180" : "")} />
                  </button>
                </th>
                <th className="w-28 p-4" />
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/40">
                      <td className="p-4"><Skeleton className="h-4 w-4" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-64" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-56" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-44" /></td>
                      <td className="p-4"><Skeleton className="h-5 w-16 ml-auto" /></td>
                    </tr>
                  ))
                : paged.map((c) => {
                    const active = Boolean(c.status ?? true)
                    return (
                      <tr key={c.customer_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <Checkbox
                            checked={Boolean(selected[c.customer_id])}
                            onCheckedChange={(v) => {
                              const checked = Boolean(v)
                              setSelected((prev) => ({ ...prev, [c.customer_id]: checked }))
                            }}
                            aria-label="Select row"
                          />
                        </td>
                        <td className="p-4">
                          <div className="font-medium">{c.firstname} {c.lastname}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{c.email}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{c.telephone ?? "—"}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={"inline-flex items-center rounded-md border px-2 py-0.5 text-xs " + (active ? "text-emerald-500 border-emerald-400/30 bg-emerald-500/10" : "text-muted-foreground border-border/60")}>
                            {active ? "Ativo" : "Inativo"}
                          </span>
                        </td>
                        <td className="p-4 text-sm">{formatDateAdded(c.date_added ?? null)}</td>
                        <td className="p-4 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-fuchsia-400 hover:text-fuchsia-300"
                            onClick={() => {
                              setEditing(c)
                              setFormOpen(true)
                            }}
                          >
                            <Pencil className="w-4 h-4" />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
            </tbody>
          </table>
        </div>

        {!loading && total === 0 ? <div className="p-6 text-sm text-muted-foreground">Sem resultados.</div> : null}

        <div className="flex flex-col gap-3 border-t border-border/60 p-4 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-muted-foreground">
            Showing {total === 0 ? 0 : startIdx + 1} to {endIdx} of {total} results
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Per page</div>
            <div className="w-24">
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPage(1)
                  setPerPage(Number(v))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={String(perPage)} />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Pagination className="md:justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.max(1, p - 1))
                  }}
                />
              </PaginationItem>

              {pageItems.map((it, idx) =>
                it === "…" ? (
                  <PaginationItem key={`e-${idx}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={it}>
                    <PaginationLink
                      href="#"
                      isActive={it === pageSafe}
                      onClick={(e) => {
                        e.preventDefault()
                        setPage(it)
                      }}
                    >
                      {it}
                    </PaginationLink>
                  </PaginationItem>
                )
              )}

              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setPage((p) => Math.min(totalPages, p + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
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

