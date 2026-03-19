import { useEffect, useMemo, useState } from "react"
import { ChevronRight, Mail, MessageSquare, Phone, Search, Sparkles } from "lucide-react"

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

import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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

  const [messages, setMessages] = useState<EspacoAbsolutoUserMessage[]>([])

  const [search, setSearch] = useState("")

  const [overviewCards, setOverviewCards] = useState<EspacoAbsolutoOverviewCard[]>([])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((row) => {
      const hay = `${row.id} ${row.name} ${row.email} ${row.phone} ${row.origin}`.toLowerCase()
      return hay.includes(q)
    })
  }, [rows, search])

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

  const load = async () => {
    setLoading(true)
    try {
      const [c, m, o] = await Promise.all([
        fetchEspacoAbsolutoCustomers(),
        fetchEspacoAbsolutoUserMessages(),
        fetchEspacoAbsolutoOverview(),
      ])
      setRows(c.data)
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
  }, [])


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

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(loading ? Array.from({ length: 6 }) : cards).map((card: any, idx) => (
          <div key={loading ? idx : card.key} className="glass-card p-5 space-y-2">
            {loading ? (
              <>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-2/3" />
              </>
            ) : (
              <>
                <div className="text-sm text-muted-foreground">{toOriginLabel(card.title)}</div>
                <div className="text-4xl font-semibold leading-none">{card.count}</div>
                <div className="text-sm flex items-center gap-1 text-muted-foreground">
                  {card.title === "Mensagens" ? <MessageSquare className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                  <span>{card.description}</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="glass-card p-3 flex items-center justify-end">
        <div className="relative w-full md:w-[340px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-9" />
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
                    <td className="p-3" colSpan={5}>
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
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span>{c.email ?? "—"}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{c.phone ?? "—"}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" className="font-normal">{toOriginLabel(String(c.origin ?? "Desconhecido"))}</Badge>
                    </td>
                    <td className="p-3">{c.registered_at ? new Date(c.registered_at).toLocaleString("pt-PT") : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr className="border-t border-border/50">
                  <td className="p-6 text-center text-muted-foreground" colSpan={5}>Sem resultados</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}