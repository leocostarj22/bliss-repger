import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Plus, Search } from "lucide-react"

import type { SupportTicket, SupportTicketPriority, SupportTicketStatus } from "@/types"
import { fetchMySupportTickets } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
      if (!q) return true
      return (r.title ?? "").toLowerCase().includes(q) || (r.description ?? "").toLowerCase().includes(q) || String(r.id).toLowerCase().includes(q)
    })
  }, [rows, search])

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
                  const statusVariant = r.status === "resolved" || r.status === "closed" ? "secondary" : r.status === "open" ? "default" : "outline"
                  const priorityVariant = r.priority === "urgent" || r.priority === "high" ? "destructive" : "secondary"
                  const descriptionShort = truncate(stripHtml(r.description), 90)
                  return (
                    <tr key={r.id} className="border-b border-border/60 hover:bg-white/5 transition-colors">
                      <td className="py-4 pr-4">
                        <div className="space-y-1 max-w-[520px]">
                          <div className="font-medium truncate">{r.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{descriptionShort || "—"}</div>
                          <div className="text-xs text-muted-foreground">{r.id}</div>
                        </div>
                      </td>
                      <td className="py-4 pr-4"><Badge variant={statusVariant as any}>{statusLabel(r.status as SupportTicketStatus)}</Badge></td>
                      <td className="py-4 pr-4"><Badge variant={priorityVariant as any}>{priorityLabel(r.priority as SupportTicketPriority)}</Badge></td>
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