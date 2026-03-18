import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2, Send } from "lucide-react"

import type { BlissCustomer } from "@/types"
import { createBlissCustomer, deleteBlissCustomer, fetchBlissCustomers, updateBlissCustomer, exportBlissCustomersToContacts, createSegment } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Checkbox } from "@/components/ui/checkbox"

export default function Customers() {
  const { toast } = useToast()
  const [rows, setRows] = useState<BlissCustomer[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BlissCustomer | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<BlissCustomer | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

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
      const resp = await fetchBlissCustomers({ search: "", status: "all" })
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

  const requestDelete = (row: BlissCustomer) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteBlissCustomer(pendingDelete.customer_id)
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
            <p className="page-subtitle">Base de clientes Bliss Natura</p>
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

          <div className="flex justify-end gap-2">
            <Button
              variant="default"
              onClick={async () => {
                const ids = Object.keys(selected).filter((k) => selected[k]);
                if (!ids.length) {
                  toast({ title: "Seleção vazia", description: "Selecione pelo menos um cliente", variant: "destructive" });
                  return;
                }
                try {
                  const res = await exportBlissCustomersToContacts(ids);
                  toast({ title: "Contactos exportados", description: `${res.data.created_count} criados, ${res.data.updated_count} atualizados` });
                  const name = window.prompt('Nome do segmento (opcional):', `Clientes Bliss – ${new Date().toLocaleDateString('pt-PT')}`);
                  if (name && res.data.contact_ids?.length) {
                    await createSegment({ name, contact_ids: res.data.contact_ids, filters: [] });
                    toast({ title: "Segmento criado", description: `${res.data.contact_ids.length} contactos adicionados` });
                  }
                } catch (e: any) {
                  toast({ title: "Erro", description: e?.message ?? 'Falha ao exportar', variant: 'destructive' })
                }
              }}
            >
              <Send className="w-4 h-4 mr-2" /> Enviar para Campanha
            </Button>
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
                <th className="p-3 w-[40px]">
                  <Checkbox
                    checked={filtered.length > 0 && filtered.every((c) => selected[c.customer_id])}
                    onCheckedChange={(v) => {
                      const all = { ...selected };
                      if (v) {
                        filtered.forEach((c) => { all[c.customer_id] = true; });
                      } else {
                        filtered.forEach((c) => { delete all[c.customer_id]; });
                      }
                      setSelected(all);
                    }}
                  />
                </th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Estado</th>
                <th className="p-3 w-[140px]"></th>
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
                filtered.map((c) => {
                  const active = Boolean(c.status ?? true)
                  return (
                    <tr key={c.customer_id} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="p-3 w-[40px]">
                        <Checkbox
                          checked={!!selected[c.customer_id]}
                          onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [c.customer_id]: !!v }))}
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-medium">{c.firstname} {c.lastname}</div>
                        <div className="text-xs text-muted-foreground">{c.customer_id}</div>
                      </td>
                      <td className="p-3">{c.email}</td>
                      <td className="p-3">{c.telephone ?? "—"}</td>
                      <td className="p-3">
                        <span className={active ? "text-emerald-400" : "text-muted-foreground"}>{active ? "Ativo" : "Inativo"}</span>
                      </td>
                      <td className="p-3">
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
                          <Button size="sm" variant="destructive" onClick={() => requestDelete(c)}>
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

      {formOpen && (
        <CustomerFormModal
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
              <div className="text-lg font-semibold">Eliminar cliente?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.firstname} ${pendingDelete.lastname}”?` : "Deseja eliminar este cliente?"}
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

function CustomerFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: BlissCustomer | null
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [firstname, setFirstname] = useState(editing?.firstname ?? "")
  const [lastname, setLastname] = useState(editing?.lastname ?? "")
  const [email, setEmail] = useState(editing?.email ?? "")
  const [telephone, setTelephone] = useState(editing?.telephone ?? "")
  const [isActive, setIsActive] = useState(editing ? Boolean(editing.status ?? true) : true)

  const submit = async () => {
    if (!firstname.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" })
      return
    }
    if (!email.trim()) {
      toast({ title: "Erro", description: "Email é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateBlissCustomer(editing.customer_id, {
          firstname,
          lastname,
          email,
          telephone: telephone.trim() ? telephone : null,
          status: isActive,
        })
        toast({ title: "Sucesso", description: "Cliente atualizado" })
      } else {
        await createBlissCustomer({
          firstname,
          lastname,
          email,
          telephone: telephone.trim() ? telephone : null,
          status: isActive,
        })
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
      <div className="glass-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">{editing ? "Editar cliente" : "Novo cliente"}</div>
            <div className="text-sm text-muted-foreground">Campos baseados nos models/resources do Filament.</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Primeiro nome</div>
            <Input value={firstname} onChange={(e) => setFirstname(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Apelido</div>
            <Input value={lastname} onChange={(e) => setLastname(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Telefone</div>
            <Input value={telephone} onChange={(e) => setTelephone(e.target.value)} />
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