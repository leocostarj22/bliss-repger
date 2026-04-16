import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Plus, Search } from "lucide-react"

import type { SupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/types"
import { fetchMySupportTickets } from "@/services/api"


const statusBadgeClass = (s: SupportTicketStatus) => {
  switch (s) {
    case "open":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/30"
    case "in_progress":
      return "bg-sky-500/10 text-sky-700 border-sky-500/30 dark:text-sky-300 dark:border-sky-400/30"
    case "pending":
      return "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-300 dark:border-amber-400/30"
    case "resolved":
      return "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300 dark:border-slate-400/30"
    case "closed":
      return "bg-zinc-500/10 text-zinc-700 border-zinc-500/30 dark:text-zinc-300 dark:border-zinc-400/30"
  }
}

const priorityBadgeClass = (p: SupportTicketPriority) => {
  switch (p) {
    case "low":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/30 dark:text-emerald-300 dark:border-emerald-400/30"
    case "medium":
      return "bg-slate-500/10 text-slate-700 border-slate-500/30 dark:text-slate-300 dark:border-slate-400/30"
    case "high":
      return "bg-orange-500/10 text-orange-700 border-orange-500/30 dark:text-orange-300 dark:border-orange-400/30"
    case "urgent":
      return "bg-red-500/10 text-red-700 border-red-500/30 dark:text-red-300 dark:border-red-400/30"
  }
}
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"

const statusLabel = (s: SupportTicketStatus) =>
  s === "open" ? "Aberto" : s === "in_progress" ? "Em progresso" : s === "pending" ? "Pendente" : s === "resolved" ? "Resolvido" : "Fechado"

const priorityLabel = (p: SupportTicketPriority) =>
  p === "low" ? "Baixa" : p === "medium" ? "Média" : p === "high" ? "Alta" : "Urgente"

const stripHtml = (input?: string | null) =>
  String(input ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const truncate = (text: string, max = 90) => (text.length > max ? `${text.slice(0, max)}…` : text)

export default function MeSupportTickets() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | SupportTicketStatus>("all")
  const [priorityFilter, setPriorityFilter] = useState<"all" | SupportTicketPriority>("all")
  const [overdueFilter, setOverdueFilter] = useState<"all" | "overdue">("all")
  const [rows, setRows] = useState<SupportTicket[]>([])

  useEffect(() => {
    let alive = true
    setLoading(true)
    fetchMySupportTickets()
      .then((resp) => {
        if (!alive) return
        setRows(resp.data)
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar os teus tickets", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [toast])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (priorityFilter !== "all" && r.priority !== priorityFilter) return false

      const due = r.due_date ? new Date(r.due_date) : null
      const dueMs = due && !Number.isNaN(due.getTime()) ? due.getTime() : null
      const isOverdue = Boolean(dueMs && dueMs < Date.now() && r.status !== "resolved" && r.status !== "closed")
      if (overdueFilter === "overdue" && !isOverdue) return false

      if (!q) return true
      const hay = `${r.title ?? ""} ${stripHtml(r.description) ?? ""} ${String(r.id)}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search, statusFilter, priorityFilter, overdueFilter])

  const dueLabel = (iso?: string | null) => {
    if (!iso) return "—"
    const d = new Date(iso)
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-PT")
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Meus Tickets</h1>
            <p className="page-subtitle">Suporte → Tickets</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/me/support/tickets/new">
              <Plus />
              Novo ticket
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título, descrição…"
            className="max-w-lg"
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-medium">Filtros</div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setStatusFilter("all")
                setPriorityFilter("all")
                setOverdueFilter("all")
              }}
            >
              Limpar
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Status</div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em progresso</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                  <SelectItem value="closed">Fechado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Prioridade</div>
              <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Vencimento</div>
              <Select value={overdueFilter} onValueChange={(v) => setOverdueFilter(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="overdue">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Ticket</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3 pr-4">Prioridade</th>
                <th className="py-3 pr-4">Vence em</th>
                <th className="py-3 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4"><Skeleton className="h-4 w-72" /></td>
                    <td className="py-4 pr-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="py-4 pr-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-4 pr-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-4 pr-4"><Skeleton className="h-9 w-24" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum ticket encontrado</td>
                </tr>
              ) : (
                filtered.map((r) => {
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="space-y-1 max-w-[520px]">
                          <div className="font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{truncate(stripHtml(r.description), 90) || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.id}</div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline" className={statusBadgeClass(r.status as SupportTicketStatus)}>
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current/70" />
                          {statusLabel(r.status as SupportTicketStatus)}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline" className={priorityBadgeClass(r.priority as SupportTicketPriority)}>
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current/70" />
                          {priorityLabel(r.priority as SupportTicketPriority)}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">{dueLabel(r.due_date)}</td>
                      <td className="py-4 pr-4">
                        <Button asChild type="button" size="sm" variant="outline">
                          <Link to={`/me/support/tickets/${r.id}`}>
                            <Eye />
                            Detalhes
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}