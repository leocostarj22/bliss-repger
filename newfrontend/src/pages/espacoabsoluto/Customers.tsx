import { useEffect, useMemo, useState } from "react"
import { CalendarDays, ChevronRight, Mail, MessageSquare, Phone, Search, Sparkles, Users } from "lucide-react"

import type {
  EspacoAbsolutoCustomer,
  EspacoAbsolutoUserMessage,
} from "@/types"
import {
  fetchEspacoAbsolutoCustomers,
  fetchEspacoAbsolutoOverview,
  fetchEspacoAbsolutoUserMessages,
  type EspacoAbsolutoOverviewCard,
} from "@/services/api"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"

const toOriginLabel = (origin: string) => (origin === "Nós ligamos!" ? "Nós Ligamos" : origin)

const cardIcon = (key: string) => {
  const k = key.toLowerCase()
  if (k.includes("mensag")) return MessageSquare
  if (k.includes("news") || k.includes("notí") || k.includes("notic")) return Mail
  if (k.includes("pergunta") || k.includes("oração") || k.includes("oracao")) return Sparkles
  return Users
}

export default function Customers() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<EspacoAbsolutoCustomer[]>([])
  const [messages, setMessages] = useState<EspacoAbsolutoUserMessage[]>([])
  const [overviewCards, setOverviewCards] = useState<EspacoAbsolutoOverviewCard[]>([])

  const [search, setSearch] = useState("")
  const [originFilter, setOriginFilter] = useState("all")
  const [registeredFrom, setRegisteredFrom] = useState("")
  const [registeredUntil, setRegisteredUntil] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(25)
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 25, totalPages: 1 })

  const cards = useMemo(() => {
    if (overviewCards.length) return overviewCards
    const byOrigin: Record<string, number> = {}
    rows.forEach((c) => {
      const key = String(c.origin ?? "Desconhecido")
      byOrigin[key] = (byOrigin[key] ?? 0) + 1
    })
    return [
      { key: "Mensagens", title: "Mensagens", description: "Total de mensagens", count: messages.length },
      ...Object.entries(byOrigin)
        .sort((a, b) => b[1] - a[1])
        .map(([title, count]) => ({ key: title, title, description: "Origem", count })),
    ]
  }, [overviewCards, rows, messages])

  const originOptions = useMemo(() => {
    const fromCards = cards
      .map((c) => String(c.title ?? "").trim())
      .filter((v) => v && v.toLowerCase() !== "mensagens")
    return Array.from(new Set(fromCards)).sort((a, b) => a.localeCompare(b, "pt"))
  }, [cards])

  const load = async () => {
    setLoading(true)
    try {
      const [c, m, o] = await Promise.all([
        fetchEspacoAbsolutoCustomers({
          search,
          origin: originFilter,
          registered_from: registeredFrom || undefined,
          registered_until: registeredUntil || undefined,
          page,
          per_page: perPage,
        }),
        fetchEspacoAbsolutoUserMessages(),
        fetchEspacoAbsolutoOverview(),
      ])
      const serverMeta = c.meta

      if (serverMeta) {
        setRows(c.data)
        setMeta({
          total: Number(serverMeta.total ?? c.data.length),
          page: Number(serverMeta.page ?? page),
          perPage: Number(serverMeta.perPage ?? perPage),
          totalPages: Number(serverMeta.totalPages ?? 1),
        })
      } else {
        const total = c.data.length
        const totalPages = Math.max(1, Math.ceil(total / perPage))
        const pageSafe = Math.min(page, totalPages)
        const start = (pageSafe - 1) * perPage
        const sliced = c.data.slice(start, start + perPage)

        setRows(sliced)
        setMeta({ total, page: pageSafe, perPage, totalPages })

        if (pageSafe !== page) setPage(pageSafe)
      }

      setMessages(m.data)
      setOverviewCards(o.data.cards)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar clientes", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [page, perPage, search, originFilter, registeredFrom, registeredUntil])


  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Espaco Absoluto Customers</span>
          <ChevronRight className="w-4 h-4" />
          <span>List</span>
        </div>
        <h1 className="page-title">Espaco Absoluto Customers</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {(loading ? Array.from({ length: 6 }) : cards).map((card: any, idx) => {
          const Icon = loading ? Users : cardIcon(String(card.title ?? ""))
          return (
            <div
              key={loading ? idx : card.key}
              className="group stat-card p-3 h-[102px] relative overflow-hidden animate-fade-in hover:shadow-[0_0_30px_hsl(var(--ring)/0.25)] hover:border-cyan-400/40 transition-all duration-300"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="absolute top-0 right-0 -mt-5 -mr-5 w-20 h-20 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-full blur-2xl group-hover:from-cyan-400/20 transition-all duration-500" />
              {loading ? (
                <div className="relative z-10 space-y-2">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : (
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400/20 to-fuchsia-500/20 ring-1 ring-white/10 group-hover:ring-cyan-400/50 shadow-sm group-hover:shadow-[0_0_12px_rgba(34,211,238,0.25)] transition-all duration-300">
                      <Icon className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                    </span>
                    <span className="text-[10px] font-medium leading-4 text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1">{toOriginLabel(card.title)}</span>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div className="text-xl font-bold leading-none tracking-tight tabular-nums bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70 group-hover:from-cyan-400 group-hover:to-fuchsia-400 transition-all duration-300">
                      {card.count}
                    </div>
                    <div className="text-[10px] leading-4 text-muted-foreground text-right line-clamp-2">{card.description}</div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="glass-card p-4 bg-gradient-to-b from-cyan-500/5 via-background to-background border-t-cyan-500/20">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setPage(1)
                setSearch(e.target.value)
              }}
              placeholder="Pesquisar por nome, email, telefone, origem..."
              className="pl-9"
            />
          </div>

          <Select value={originFilter} onValueChange={(v) => { setPage(1); setOriginFilter(v) }}>
            <SelectTrigger>
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as origens</SelectItem>
              {originOptions.map((o) => (
                <SelectItem key={o} value={o}>{toOriginLabel(o)}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={registeredFrom} onChange={(e) => { setPage(1); setRegisteredFrom(e.target.value) }} />
          </div>

          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <Input type="date" value={registeredUntil} onChange={(e) => { setPage(1); setRegisteredUntil(e.target.value) }} />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <Select value={String(perPage)} onValueChange={(v) => { setPage(1); setPerPage(Number(v)) }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={`${perPage} por página`} />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 100].map((n) => (<SelectItem key={n} value={String(n)}>{n} por página</SelectItem>))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => {
              setPage(1)
              setSearch("")
              setOriginFilter("all")
              setRegisteredFrom("")
              setRegisteredUntil("")
            }}
          >
            Limpar filtros
          </Button>
        </div>
      </div>

      <div className="glass-card p-0 overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr className="text-left">
                <th className="p-3">Nome</th>
                <th className="p-3">Email</th>
                <th className="p-3">Telefone</th>
                <th className="p-3">Origem</th>
                <th className="p-3">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-t border-border/50">
                    <td className="p-3" colSpan={5}><Skeleton className="h-6 w-full" /></td>
                  </tr>
                ))
              ) : rows.length ? (
                rows.map((c) => (
                  <tr key={String(c.id)} className="border-t border-border/50 hover:bg-muted/20">
                    <td className="p-3"><div className="font-medium">{c.name}</div><div className="text-xs text-muted-foreground">{c.id}</div></td>
                    <td className="p-3"><div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" /><span>{c.email ?? "—"}</span></div></td>
                    <td className="p-3"><div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" /><span>{c.phone ?? "—"}</span></div></td>
                    <td className="p-3"><Badge variant="secondary" className="font-normal">{toOriginLabel(String(c.origin ?? "Desconhecido"))}</Badge></td>
                    <td className="p-3">{c.registered_at ? new Date(c.registered_at).toLocaleString("pt-PT") : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>Sem resultados para os filtros selecionados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-xs text-muted-foreground">{meta.total} clientes • página {meta.page} de {meta.totalPages}</div>
        <Pagination className="md:justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(1, p - 1)) }} />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(meta.totalPages || 1, p + 1)) }} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}