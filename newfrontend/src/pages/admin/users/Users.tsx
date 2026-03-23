import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowUpDown, Eye, Mail, MessageSquare, Pencil, Plus, Search, Ticket, Trash2, User as UserIcon } from "lucide-react"

import type { Company, Department, User } from "@/types"
import { deleteUser, fetchCompanies, fetchDepartments, fetchMyAccess, fetchUsers } from "@/services/api"
import { Button } from "@/components/ui/button"
import { hasPermission } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const ONLINE_WINDOW_MINUTES = 15

type SortKey = "name" | "company" | "department" | "role" | "active" | "online"
type SortDir = "asc" | "desc"

export default function Users() {
  const { toast } = useToast()
  const [rows, setRows] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const [canQuickActions, setCanQuickActions] = useState(false)

  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => (map[c.id] = c.name))
    return map
  }, [companies])

  const departmentNameById = useMemo(() => {
    const map: Record<string, string> = {}
    departments.forEach((d) => (map[d.id] = d.name))
    return map
  }, [departments])

  const filteredDepartmentsForSelect = useMemo(() => {
    if (companyFilter === "all") return departments
    return departments.filter((d) => d.company_id === companyFilter)
  }, [companyFilter, departments])

  const sortBy = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortKey(key)
    setSortDir("asc")
  }

  const isOnline = (u: User) => {
    const ts = u.last_login_at ? Date.parse(u.last_login_at) : NaN
    return u.is_active && Number.isFinite(ts) && ts >= Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000
  }

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1

    const norm = (v: unknown) => String(v ?? "").toLowerCase().trim()
    const cmpStr = (a: unknown, b: unknown) => {
      const av = norm(a)
      const bv = norm(b)
      if (av < bv) return -1
      if (av > bv) return 1
      return 0
    }

    const base = [...rows]
    base.sort((a, b) => {
      if (sortKey === "name") return cmpStr(a.name, b.name) * dir
      if (sortKey === "role") return cmpStr(a.role ?? "", b.role ?? "") * dir
      if (sortKey === "company") {
        const an = a.company_id ? companyNameById[a.company_id] ?? a.company_id : ""
        const bn = b.company_id ? companyNameById[b.company_id] ?? b.company_id : ""
        return cmpStr(an, bn) * dir
      }
      if (sortKey === "department") {
        const an = a.department_id ? departmentNameById[a.department_id] ?? a.department_id : ""
        const bn = b.department_id ? departmentNameById[b.department_id] ?? b.department_id : ""
        return cmpStr(an, bn) * dir
      }
      if (sortKey === "active") {
        const av = a.is_active ? 1 : 0
        const bv = b.is_active ? 1 : 0
        if (av !== bv) return (av - bv) * dir
        return cmpStr(a.name, b.name) * dir
      }
      if (sortKey === "online") {
        const av = isOnline(a) ? 1 : 0
        const bv = isOnline(b) ? 1 : 0
        if (av !== bv) return (av - bv) * dir
        return cmpStr(a.name, b.name) * dir
      }
      return 0
    })

    return base
  }, [rows, sortKey, sortDir, companyNameById, departmentNameById])

  useEffect(() => {
    let alive = true

    fetchMyAccess()
      .then((r) => {
        if (!alive) return
        const allowed = Boolean(r.data.isAdmin) || hasPermission(r.data.permissions, "admin.users.write")
        setCanQuickActions(allowed)
      })
      .catch(() => {
        if (!alive) return
        setCanQuickActions(false)
      })

    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (companyFilter !== "all" && departmentFilter !== "all") {
      const dep = departments.find((d) => d.id === departmentFilter)
      if (dep && dep.company_id !== companyFilter) setDepartmentFilter("all")
    }
  }, [companyFilter, departmentFilter, departments])

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)

      const is_active =
        activeFilter === "all" ? undefined : activeFilter === "active" ? true : false

      Promise.all([
        fetchUsers({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
          department_id: departmentFilter === "all" ? undefined : departmentFilter,
          is_active,
        }),
        fetchCompanies(),
        fetchDepartments(),
      ])
        .then(([usersResp, compsResp, depsResp]) => {
          setRows(usersResp.data)
          setCompanies(compsResp.data)
          setDepartments(depsResp.data)
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => clearTimeout(t)
  }, [search, companyFilter, departmentFilter, activeFilter])

  const requestDelete = (u: User) => {
    setPendingDelete(u)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const u = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!u) return

    try {
      await deleteUser(u.id)
      setRows((prev) => prev.filter((x) => x.id !== u.id))
      toast({ title: "Sucesso", description: "Utilizador eliminado" })
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Utilizadores</h1>
            <p className="page-subtitle">Administração → Utilizadores</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/admin/users/new">
              <Plus />
              Novo utilizador
            </Link>
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
              placeholder="Pesquisar por nome, email, telefone, role…"
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

          <div className="w-full lg:w-[240px]">
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {filteredDepartmentsForSelect.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[180px]">
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
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

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("name")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Utilizador
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "name" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("company")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Empresa
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "company" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("department")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Departamento
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "department" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("role")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Role
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "role" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("active")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Ativo
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "active" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 pr-4">
                  <button
                    type="button"
                    onClick={() => sortBy("online")}
                    className="inline-flex items-center gap-2 hover:text-foreground transition-colors"
                  >
                    Online
                    <ArrowUpDown className={"w-4 h-4 opacity-60" + (sortKey === "online" ? " opacity-100" : "")} />
                  </button>
                </th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    Nenhum utilizador encontrado
                  </td>
                </tr>
              ) : (
                sortedRows.map((u) => (
                  <tr key={u.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="min-w-0">
                        {canQuickActions ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="font-semibold truncate">{u.name}</div>
                            <div className="inline-flex items-center gap-1 shrink-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <Link
                                  to={`/communication/messages?to_user_id=${encodeURIComponent(u.id)}`}
                                  aria-label={`Enviar mensagem para ${u.name}`}
                                  title="Mensagem"
                                >
                                  <Mail className="w-4 h-4 text-emerald-400" />
                                </Link>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <Link
                                  to={`/support/tickets?new=1&assigned_to=${encodeURIComponent(u.id)}`}
                                  aria-label={`Abrir um ticket para ${u.name}`}
                                  title="Ticket"
                                >
                                  <Ticket className="w-4 h-4 text-amber-400" />
                                </Link>
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  window.dispatchEvent(
                                    new CustomEvent("gmcentral:chat:open", {
                                      detail: {
                                        userId: String(u.id),
                                        name: u.name,
                                        email: u.email,
                                      },
                                    }),
                                  )
                                }}
                                aria-label={`Ir ao chat com ${u.name}`}
                                title="Chat"
                              >
                                <MessageSquare className="w-4 h-4 text-cyan-400" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="font-semibold truncate">{u.name}</div>
                        )}
                        <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{u.company_id ? companyNameById[u.company_id] ?? u.company_id : "—"}</td>
                    <td className="py-4 pr-4">
                      {u.department_id ? departmentNameById[u.department_id] ?? u.department_id : "—"}
                    </td>
                    <td className="py-4 pr-4">{u.role ?? "—"}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                          u.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border",
                        ].join(" ")}
                      >
                        {u.is_active ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      {(() => {
                        const online = isOnline(u)

                        return (
                          <span
                            className={[
                              "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium border",
                              online
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-muted text-muted-foreground border-border",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "h-2 w-2 rounded-full",
                                online ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/40",
                              ].join(" ")}
                            />
                            {online ? "Online" : "Offline"}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${u.id}`}>
                            <Eye />
                            Ver
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/users/${u.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(u)}>
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
              <div className="text-lg font-semibold">Eliminar utilizador?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.name}”?` : "Deseja eliminar este utilizador?"}
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