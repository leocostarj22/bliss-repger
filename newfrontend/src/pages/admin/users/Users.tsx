import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Link } from "react-router-dom"
import {
  ArrowUpDown, Eye, Pencil, Plus, Search, Trash2, User as UserIcon,
  MessageSquare, TicketCheck, MessageCircle, X, Send, ChevronDown, ChevronUp,
} from "lucide-react"

import type { Company, Department, InternalMessage, User } from "@/types"
import {
  deleteUser, fetchCompanies, fetchDepartments, fetchUsers,
  fetchUser, sendInternalMessage, createSupportTicket, fetchInternalMessages,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const ONLINE_WINDOW_MINUTES = 15
const PRIVILEGED_ROLES = ["admin", "manager", "supervisor"]

type SortKey = "name" | "company" | "department" | "role" | "active" | "online"
type SortDir = "asc" | "desc"

// ── Floating Chat Panel ───────────────────────────────────────────────────────
function FloatingChat({
  target,
  currentUserId,
  onClose,
}: {
  target: User
  currentUserId: string
  onClose: () => void
}) {
  const { toast } = useToast()
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([
      fetchInternalMessages({ folder: "inbox" }),
      fetchInternalMessages({ folder: "sent" }),
    ])
      .then(([inbox, sent]) => {
        const all = [...inbox.data, ...sent.data]
        const seen = new Set<string>()
        const unique = all.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)))
        const thread = unique
          .filter(
            (m) =>
              (m.from_user_id === currentUserId && m.to_user_id === target.id) ||
              (m.from_user_id === target.id && m.to_user_id === currentUserId),
          )
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        setMessages(thread)
      })
      .catch(() => setMessages([]))
  }, [target.id, currentUserId])

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, minimized])

  const handleSend = async () => {
    const body = input.trim()
    if (!body) return
    setSending(true)
    try {
      const res = await sendInternalMessage({
        to_user_id: target.id,
        subject: `Chat com ${target.name}`,
        body,
      })
      setMessages((prev) => [...prev, res.data])
      setInput("")
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[300] w-80 flex flex-col shadow-2xl rounded-xl overflow-hidden border border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-400 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
            <UserIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold truncate">{target.name}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => setMinimized((v) => !v)}
            className="p-1 rounded hover:bg-secondary/60 transition-colors text-muted-foreground"
          >
            {minimized ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-secondary/60 transition-colors text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64 bg-background/80">
            {messages.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Nenhuma mensagem. Comece a conversa!
              </p>
            ) : (
              messages.map((m) => {
                const isMine = m.from_user_id === currentUserId
                return (
                  <div
                    key={m.id}
                    className={["flex", isMine ? "justify-end" : "justify-start"].join(" ")}
                  >
                    <div
                      className={[
                        "max-w-[80%] rounded-lg px-3 py-1.5 text-xs",
                        isMine
                          ? "bg-cyan-500/20 text-cyan-100 rounded-br-none"
                          : "bg-secondary text-foreground rounded-bl-none",
                      ].join(" ")}
                    >
                      {m.body}
                    </div>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 p-2 border-t border-border bg-background">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva uma mensagem…"
              className="h-8 text-xs"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
            />
            <Button
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              disabled={sending || !input.trim()}
              onClick={handleSend}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </>
      )}
    </div>,
    document.body,
  )
}

// ── Quick Action Popover ──────────────────────────────────────────────────────
function QuickActionMenu({
  user,
  onMessage,
  onTicket,
  onChat,
}: {
  user: User
  onMessage: (u: User) => void
  onTicket: (u: User) => void
  onChat: (u: User) => void
}) {
  return (
    <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 z-50 flex items-center gap-1 bg-background border border-border rounded-lg px-2 py-1.5 shadow-lg animate-in fade-in slide-in-from-right-2 duration-150">
      <button
        type="button"
        title="Enviar mensagem"
        onClick={() => onMessage(user)}
        className="p-1.5 rounded-md hover:bg-cyan-500/10 hover:text-cyan-400 transition-colors text-muted-foreground"
      >
        <MessageSquare className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Criar ticket"
        onClick={() => onTicket(user)}
        className="p-1.5 rounded-md hover:bg-fuchsia-500/10 hover:text-fuchsia-400 transition-colors text-muted-foreground"
      >
        <TicketCheck className="h-4 w-4" />
      </button>
      <button
        type="button"
        title="Abrir chat"
        onClick={() => onChat(user)}
        className="p-1.5 rounded-md hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors text-muted-foreground"
      >
        <MessageCircle className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Users() {
  const { toast } = useToast()
  const [rows, setRows] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)

  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)

  // Current logged-in user info
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)

  // Hover state
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // Send Message modal
  const [msgOpen, setMsgOpen] = useState(false)
  const [msgTarget, setMsgTarget] = useState<User | null>(null)
  const [msgSubject, setMsgSubject] = useState("")
  const [msgBody, setMsgBody] = useState("")
  const [msgSending, setMsgSending] = useState(false)

  // Create Ticket modal
  const [ticketOpen, setTicketOpen] = useState(false)
  const [ticketTarget, setTicketTarget] = useState<User | null>(null)
  const [ticketTitle, setTicketTitle] = useState("")
  const [ticketDesc, setTicketDesc] = useState("")
  const [ticketPriority, setTicketPriority] = useState<"low" | "medium" | "high" | "urgent">("medium")
  const [ticketCreating, setTicketCreating] = useState(false)

  // Floating Chat
  const [chatTarget, setChatTarget] = useState<User | null>(null)

  const canUseQuickActions =
    currentUserRole && PRIVILEGED_ROLES.includes(currentUserRole.toLowerCase())

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

  // Fetch current user role once on mount
  useEffect(() => {
    fetchUser()
      .then((r) => {
        setCurrentUserId(r.data.id)
        setCurrentUserRole(r.data.role ?? null)
      })
      .catch(() => {})
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

  // Quick actions
  const openMessage = (u: User) => {
    setMsgTarget(u)
    setMsgSubject("")
    setMsgBody("")
    setMsgOpen(true)
  }

  const openTicket = (u: User) => {
    setTicketTarget(u)
    setTicketTitle("")
    setTicketDesc("")
    setTicketPriority("medium")
    setTicketOpen(true)
  }

  const openChat = (u: User) => {
    setChatTarget(u)
  }

  const sendMessage = async () => {
    if (!msgTarget || !msgSubject.trim() || !msgBody.trim()) return
    setMsgSending(true)
    try {
      await sendInternalMessage({
        to_user_id: msgTarget.id,
        subject: msgSubject.trim(),
        body: msgBody.trim(),
      })
      toast({ title: "Mensagem enviada", description: `Mensagem enviada a ${msgTarget.name}` })
      setMsgOpen(false)
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" })
    } finally {
      setMsgSending(false)
    }
  }

  const submitTicket = async () => {
    if (!ticketTarget || !ticketTitle.trim()) return
    setTicketCreating(true)
    try {
      await createSupportTicket({
        company_id: ticketTarget.company_id ?? "",
        title: ticketTitle.trim(),
        description: ticketDesc.trim(),
        status: "open",
        priority: ticketPriority,
        user_id: ticketTarget.id,
        user_type: "user",
        category_id: null,
        department_id: ticketTarget.department_id ?? null,
        assigned_to: null,
        resolved_at: null,
        due_date: null,
      })
      toast({ title: "Ticket criado", description: `Ticket criado para ${ticketTarget.name}` })
      setTicketOpen(false)
    } catch {
      toast({ title: "Erro", description: "Falha ao criar ticket", variant: "destructive" })
    } finally {
      setTicketCreating(false)
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
                  <tr
                    key={u.id}
                    className="border-b border-border/60 hover:bg-secondary/30 transition-colors"
                    onMouseEnter={() => setHoveredRow(u.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Utilizador cell — with hover quick-action menu */}
                    <td className="py-4 pr-4">
                      <div className="relative flex items-center gap-2 min-w-0">
                        {/* Quick-action popover (hover, privileged roles only) */}
                        {canUseQuickActions && hoveredRow === u.id && (
                          <QuickActionMenu
                            user={u}
                            onMessage={openMessage}
                            onTicket={openTicket}
                            onChat={openChat}
                          />
                        )}
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{u.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{u.email}</div>
                        </div>
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

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
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
                {pendingDelete ? `Deseja eliminar "${pendingDelete.name}"?` : "Deseja eliminar este utilizador?"}
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

      {/* ── Send Message Modal ─────────────────────────────────────────────── */}
      {msgOpen && msgTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setMsgOpen(false)}
        >
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Enviar mensagem</div>
                <div className="text-sm text-muted-foreground">Para: {msgTarget.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setMsgOpen(false)}
                className="p-1 rounded hover:bg-secondary/60 transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Assunto</label>
                <Input
                  value={msgSubject}
                  onChange={(e) => setMsgSubject(e.target.value)}
                  placeholder="Assunto da mensagem"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Mensagem</label>
                <Textarea
                  value={msgBody}
                  onChange={(e) => setMsgBody(e.target.value)}
                  placeholder="Escreva a sua mensagem…"
                  rows={4}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMsgOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={sendMessage}
                disabled={msgSending || !msgSubject.trim() || !msgBody.trim()}
              >
                <Send className="h-4 w-4" />
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Ticket Modal ────────────────────────────────────────────── */}
      {ticketOpen && ticketTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setTicketOpen(false)}
        >
          <div className="glass-card w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Criar ticket</div>
                <div className="text-sm text-muted-foreground">Para: {ticketTarget.name}</div>
              </div>
              <button
                type="button"
                onClick={() => setTicketOpen(false)}
                className="p-1 rounded hover:bg-secondary/60 transition-colors text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Título</label>
                <Input
                  value={ticketTitle}
                  onChange={(e) => setTicketTitle(e.target.value)}
                  placeholder="Título do ticket"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                <Textarea
                  value={ticketDesc}
                  onChange={(e) => setTicketDesc(e.target.value)}
                  placeholder="Descreva o problema ou pedido…"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Prioridade</label>
                <Select value={ticketPriority} onValueChange={(v) => setTicketPriority(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTicketOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={submitTicket}
                disabled={ticketCreating || !ticketTitle.trim()}
              >
                <TicketCheck className="h-4 w-4" />
                Criar ticket
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Chat ──────────────────────────────────────────────────── */}
      {chatTarget && currentUserId && (
        <FloatingChat
          target={chatTarget}
          currentUserId={currentUserId}
          onClose={() => setChatTarget(null)}
        />
      )}
    </div>
  )
}
