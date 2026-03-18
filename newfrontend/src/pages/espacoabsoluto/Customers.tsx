import { useEffect, useMemo, useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { EspacoAbsolutoCustomer, EspacoAbsolutoUserGroup, EspacoAbsolutoUserMessage } from "@/types"
import {
  createEspacoAbsolutoCustomer,
  deleteEspacoAbsolutoCustomer,
  fetchEspacoAbsolutoCustomers,
  fetchEspacoAbsolutoUserGroups,
  fetchEspacoAbsolutoUserMessages,
  updateEspacoAbsolutoCustomer,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const toOriginLabel = (origin: string) => (origin === "Nós ligamos!" ? "Nós Ligamos" : origin)

const parseIsoMs = (v: string | null | undefined) => {
  if (!v) return 0
  const ms = Date.parse(v)
  return Number.isFinite(ms) ? ms : 0
}

const startOfDayMs = (dateOnly: string) => parseIsoMs(`${dateOnly}T00:00:00.000`)
const endOfDayMs = (dateOnly: string) => parseIsoMs(`${dateOnly}T23:59:59.999`)

export default function Customers() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EspacoAbsolutoCustomer[]>([])
  const [groups, setGroups] = useState<EspacoAbsolutoUserGroup[]>([])
  const [messages, setMessages] = useState<EspacoAbsolutoUserMessage[]>([])

  const [search, setSearch] = useState("")
  const [originFilter, setOriginFilter] = useState<string>("all")
  const [registeredFrom, setRegisteredFrom] = useState("")
  const [registeredUntil, setRegisteredUntil] = useState("")

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EspacoAbsolutoCustomer | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<EspacoAbsolutoCustomer | null>(null)

  const originOptions = useMemo(() => {
    const dashboardGroups = groups.filter((g) => Boolean(g.dashboard))
    const names = dashboardGroups.map((g) => String(g.name ?? "").trim()).filter(Boolean)
    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
    return unique.map((value) => ({ value, label: toOriginLabel(value) }))
  }, [groups])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const fromMs = registeredFrom ? startOfDayMs(registeredFrom) : null
    const untilMs = registeredUntil ? endOfDayMs(registeredUntil) : null

    return rows.filter((c) => {
      const origin = String(c.origin ?? "Desconhecido")

      if (originFilter !== "all") {
        const selected = originFilter.trim().toLowerCase()
        const dbValue = selected === "nós ligamos" ? "nós ligamos!" : selected
        if (origin.trim().toLowerCase() !== dbValue) return false
      }

      const addedMs = parseIsoMs(c.registered_at)
      if (fromMs !== null && addedMs < fromMs) return false
      if (untilMs !== null && addedMs > untilMs) return false

      if (!q) return true
      const hay = `${c.id} ${c.name ?? ""} ${c.email ?? ""} ${c.phone ?? ""} ${origin}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, originFilter, registeredFrom, registeredUntil])

  const stats = useMemo(() => {
    const byOrigin: Record<string, number> = {}
    rows.forEach((c) => {
      const key = String(c.origin ?? "Desconhecido")
      byOrigin[key] = (byOrigin[key] ?? 0) + 1
    })

    const topOrigins = Object.entries(byOrigin)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    return {
      customersCount: rows.length,
      messagesCount: messages.length,
      topOrigins,
    }
  }, [rows, messages])

  const load = async () => {
    setLoading(true)
    try {
      const [c, g, m] = await Promise.all([fetchEspacoAbsolutoCustomers(), fetchEspacoAbsolutoUserGroups(), fetchEspacoAbsolutoUserMessages()])
      setRows(c.data)
      setGroups(g.data)
      setMessages(m.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar clientes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const requestDelete = (row: EspacoAbsolutoCustomer) => {
    setPendingDelete(row)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    try {
      await deleteEspacoAbsolutoCustomer(Number(pendingDelete.id))
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
            <p className="page-subtitle">Espaço Absoluto → Clientes</p>
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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Clientes</div>
          <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-20" /> : stats.customersCount}</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Mensagens</div>
          <div className="text-2xl font-semibold">{loading ? <Skeleton className="h-7 w-20" /> : stats.messagesCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Total de mensagens (Espaço Absoluto)</div>
        </div>

        <div className="glass-card p-5">
          <div className="text-xs text-muted-foreground">Origens (Top)</div>
          <div className="mt-2 space-y-1">
            {loading ? (
              <>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </>
            ) : stats.topOrigins.length ? (
              stats.topOrigins.slice(0, 3).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{toOriginLabel(name)}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">Sem dados.</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="grid gap-3 md:grid-cols-12">
          <div className="relative md:col-span-5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar..." className="pl-9" />
          </div>

          <div className="md:col-span-3">
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {originOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Registrado de</div>
            <Input value={registeredFrom} onChange={(e) => setRegisteredFrom(e.target.value)} type="date" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Registrado até</div>
            <Input value={registeredUntil} onChange={(e) => setRegisteredUntil(e.target.value)} type="date" />
          </div>

          <div className="md:col-span-12 flex justify-end">
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
                <th className="p-3">Cliente</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Cadastro</th>
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
                filtered.map((c) => (
                  <tr key={String(c.id)} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.id}</div>
                    </td>
                    <td className="p-3">{c.email ?? "—"}</td>
                    <td className="p-3">{c.phone ?? "—"}</td>
                    <td className="p-3">{toOriginLabel(String(c.origin ?? "Desconhecido"))}</td>
                    <td className="p-3">
                      {c.registered_at ? new Date(c.registered_at).toLocaleString("pt-PT") : "—"}
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
                ))
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
        <CustomerFormModal
          editing={editing}
          originOptions={originOptions}
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
                {pendingDelete ? `Deseja eliminar “${pendingDelete.name}”?` : "Deseja eliminar este cliente?"}
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
  originOptions,
  onClose,
  onSaved,
}: {
  editing: EspacoAbsolutoCustomer | null
  originOptions: Array<{ value: string; label: string }>
  onClose: () => void
  onSaved: () => void
}) {
  const { toast } = useToast()
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState(editing?.name ?? "")
  const [email, setEmail] = useState(editing?.email ?? "")
  const [phone, setPhone] = useState(editing?.phone ?? "")
  const [origin, setOrigin] = useState(editing?.origin ?? (originOptions[0]?.value ?? "Desconhecido"))
  const [isActive, setIsActive] = useState(editing ? Boolean(editing.status) : true)

  const submit = async () => {
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await updateEspacoAbsolutoCustomer(Number(editing.id), {
          name,
          email: email.trim() ? email : null,
          phone: phone.trim() ? phone : null,
          origin,
          status: isActive,
        })
        toast({ title: "Sucesso", description: "Cliente atualizado" })
      } else {
        await createEspacoAbsolutoCustomer({
          name,
          email: email.trim() ? email : null,
          phone: phone.trim() ? phone : null,
          origin,
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
            <div className="text-sm text-muted-foreground">Campos baseados no EspacoAbsolutoCustomerResource (Filament).</div>
          </div>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Nome</div>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Email</div>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Telefone</div>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <div className="space-y-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">Origem</div>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                {originOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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