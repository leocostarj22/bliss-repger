import { useEffect, useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"

import type { SystemLog, User } from "@/types"
import { fetchSystemLog, fetchSystemLogs, fetchUsers } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const levelBadge = (level: string) => {
  const l = (level || "").toLowerCase()
  if (l === "error" || l === "critical") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
  if (l === "warning") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  if (l === "info") return "bg-sky-500/10 text-sky-400 border-sky-500/20"
  if (l === "debug") return "bg-muted text-muted-foreground border-border"
  return "bg-muted text-muted-foreground border-border"
}

export default function SystemLogs() {
  const { toast } = useToast()
  const [rows, setRows] = useState<SystemLog[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [levelFilter, setLevelFilter] = useState<string>("all")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")

  const [viewOpen, setViewOpen] = useState(false)
  const [selected, setSelected] = useState<SystemLog | null>(null)
  const [viewLoading, setViewLoading] = useState(false)

  const userNameById = useMemo(() => {
    const map: Record<string, string> = {}
    users.forEach((u) => (map[u.id] = u.name))
    return map
  }, [users])

  const actionOptions = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => {
      const a = String(r.action || "")
      if (!a) return
      if (a === "login" || a === "logout") return
      set.add(a)
    })
    return Array.from(set).sort()
  }, [rows])

  const load = async () => {
    setLoading(true)
    try {
      const [logsResp, usersResp] = await Promise.all([
        fetchSystemLogs({
          search,
          level: levelFilter === "all" ? undefined : levelFilter,
          action: actionFilter === "all" ? undefined : actionFilter,
          user_id: userFilter === "all" ? undefined : userFilter === "system" ? null : userFilter,
        }),
        fetchUsers(),
      ])
      setRows(logsResp.data)
      setUsers(usersResp.data)
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar logs", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const t = setTimeout(() => {
      load()
    }, 250)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, levelFilter, actionFilter, userFilter])

  const openView = async (row: SystemLog) => {
    setViewOpen(true)
    setSelected(row)
    setViewLoading(true)
    try {
      const resp = await fetchSystemLog(row.id)
      setSelected(resp.data)
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar detalhe do log", variant: "destructive" })
    } finally {
      setViewLoading(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Logs do Sistema</h1>
            <p className="page-subtitle">Relatórios e Logs → Logs do Sistema</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por ação, modelo, descrição, nível…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[200px]">
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="debug">debug</SelectItem>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="warning">warning</SelectItem>
                <SelectItem value="error">error</SelectItem>
                <SelectItem value="critical">critical</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[260px]">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="login">login</SelectItem>
                <SelectItem value="logout">logout</SelectItem>
                {actionOptions.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full lg:w-[240px]">
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Utilizador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="system">Sistema</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Data</th>
                <th className="py-3 pr-4">Nível</th>
                <th className="py-3 pr-4">Ação</th>
                <th className="py-3 pr-4">Utilizador</th>
                <th className="py-3 pr-4">Modelo</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-56" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-56" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum log encontrado
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                    <td className="py-4 pr-4">{new Date(r.created_at).toLocaleString("pt-PT")}</td>
                    <td className="py-4 pr-4">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border", levelBadge(r.level))}>
                        {r.level}
                      </span>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="font-medium">{r.action}</div>
                      {r.description ? <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div> : null}
                    </td>
                    <td className="py-4 pr-4">{r.user_id ? userNameById[r.user_id] ?? r.user_id : "Sistema"}</td>
                    <td className="py-4 pr-4">
                      <div className="text-xs">{r.model_type ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.model_id ?? "—"}</div>
                    </td>
                    <td className="py-4 text-right">
                      <Button variant="outline" size="sm" onClick={() => openView(r)}>
                        <Eye />
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewOpen && (
        <div
          className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setViewOpen(false)
            setSelected(null)
          }}
        >
          <div className="glass-card w-full max-w-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Detalhe do Log</div>
                <div className="text-sm text-muted-foreground">{selected?.id ?? "—"}</div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setViewOpen(false)
                  setSelected(null)
                }}
              >
                Fechar
              </Button>
            </div>

            <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
              {viewLoading || !selected ? (
                <>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </>
              ) : (
                <>
                  <div>
                    <div className="text-xs text-muted-foreground">Data</div>
                    <div className="font-medium">{new Date(selected.created_at).toLocaleString("pt-PT")}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Nível</div>
                    <div className="mt-1">
                      <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border", levelBadge(selected.level))}>
                        {selected.level}
                      </span>
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">Ação</div>
                    <div className="font-medium">{selected.action}</div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">Descrição</div>
                    <div className="font-medium whitespace-pre-wrap">{selected.description ?? "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">Utilizador</div>
                    <div className="font-medium">{selected.user_id ? userNameById[selected.user_id] ?? selected.user_id : "Sistema"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground">IP</div>
                    <div className="font-medium">{selected.ip_address ?? "—"}</div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">User Agent</div>
                    <div className="font-medium break-words">{selected.user_agent ?? "—"}</div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">Modelo</div>
                    <div className="font-medium">{selected.model_type ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{selected.model_id ?? "—"}</div>
                  </div>

                  <div className="lg:col-span-2">
                    <div className="text-xs text-muted-foreground">Context</div>
                    <pre className="mt-1 rounded-md border border-border bg-background/40 p-3 text-xs overflow-auto">
                      {JSON.stringify(selected.context ?? {}, null, 2)}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}