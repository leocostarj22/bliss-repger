import { useEffect, useMemo, useState } from "react"
import { Eye, Search } from "lucide-react"
import { useNavigate } from "react-router-dom"

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

const classBasename = (value?: string | null) => {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  const parts = raw.split("\\")
  return parts[parts.length - 1] ?? raw
}

const modelTypeLabel = (modelType?: string | null) => {
  const base = classBasename(modelType)
  const key = base.toLowerCase()

  if (key === "personalnote") return "Anotação"
  if (key === "task") return "Tarefa"
  if (key === "user") return "Utilizador"
  if (key === "ticket") return "Ticket"
  if (key === "post") return "Publicação"

  return base || "Sistema"
}

const getModelPrimaryLabel = (row: SystemLog) => {
  const data = (row as any)?.context?.model_data
  const title = typeof data?.title === "string" ? data.title.trim() : ""
  const name = typeof data?.name === "string" ? data.name.trim() : ""
  const email = typeof data?.email === "string" ? data.email.trim() : ""
  return title || name || email
}

const describeAction = (row: SystemLog) => {
  const action = String(row.action ?? "").trim().toLowerCase()
  const typeLabel = modelTypeLabel(row.model_type)
  const primary = getModelPrimaryLabel(row)
  const id = String(row.model_id ?? "").trim()

  if (action === "login") return "Iniciou sessão"
  if (action === "logout") return "Terminou sessão"

  const suffix = primary ? `: ${primary}` : id ? ` #${id}` : ""

  if (action === "create") return `Criou ${typeLabel.toLowerCase()}${suffix}`
  if (action === "update") return `Atualizou ${typeLabel.toLowerCase()}${suffix}`
  if (action === "delete") return `Eliminou ${typeLabel.toLowerCase()}${suffix}`

  return suffix ? `${row.action}${suffix}` : row.action
}

const normalizeDescription = (row: SystemLog) => {
  const raw = String(row.description ?? "").trim()
  if (!raw) return ""
  if (/^Registro\s+(criado|atualizado|exclu[ií]do)$/i.test(raw)) return ""
  return raw
}

const resourceLabel = (row: SystemLog) => {
  const typeLabel = modelTypeLabel(row.model_type)
  const primary = getModelPrimaryLabel(row)
  const id = String(row.model_id ?? "").trim()

  if (typeLabel === "Sistema" && !primary && !id) return "Sistema"
  if (primary) return `${typeLabel}: ${primary}`
  if (id) return `${typeLabel} #${id}`
  return typeLabel
}

export default function SystemLogs() {
  const { toast } = useToast()
  const navigate = useNavigate()
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

  const openView = (row: SystemLog) => {
    navigate(`/reports/system-logs/${encodeURIComponent(row.id)}`)
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
              placeholder="Pesquisar por ação, descrição, nível…"
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
                <th className="py-3 pr-4">Evento</th>
                <th className="py-3 pr-4">Utilizador</th>
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
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
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
                      <div className="font-medium">{describeAction(r)}</div>
                      {normalizeDescription(r) ? <div className="text-xs text-muted-foreground line-clamp-1">{normalizeDescription(r)}</div> : null}
                      <div className="text-xs text-muted-foreground line-clamp-1">{resourceLabel(r)}</div>
                    </td>
                    <td className="py-4 pr-4">{r.user_id ? userNameById[r.user_id] ?? r.user_id : "Sistema"}</td>
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
    </div>
  )
}