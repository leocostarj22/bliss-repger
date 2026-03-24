import { useEffect, useMemo, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Save } from "lucide-react"

import type { SupportTicket, SupportTicketPriority } from "@/types"
import { createMySupportTicket, fetchMyEmployee, fetchMySupportTicket } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"

export default function MeSupportTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(Boolean(id))
  const [saving, setSaving] = useState(false)
  const [ticket, setTicket] = useState<SupportTicket | null>(null)

  const [companyId, setCompanyId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<SupportTicketPriority>("medium")
  const [dueDate, setDueDate] = useState<string>("")

  useEffect(() => {
    let alive = true
    if (!id) {
      fetchMyEmployee()
        .then((r) => {
          if (!alive) return
          const cid = String(r.data.company_id ?? "")
          setCompanyId(cid)
        })
        .catch(() => {
          if (!alive) return
          toast({ title: "Aviso", description: "Não foi possível carregar a empresa. Seleciona manualmente.", variant: "default" })
        })
      return
    }

    setLoading(true)
    fetchMySupportTicket(String(id))
      .then((resp) => {
        if (!alive) return
        setTicket(resp.data)
      })
      .catch(() => {
        if (!alive) return
        toast({ title: "Erro", description: "Não foi possível carregar o ticket", variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [id, toast])

  const isNew = useMemo(() => !id, [id])

  const submit = async () => {
    if (!companyId) {
      toast({ title: "Validação", description: "Empresa é obrigatória", variant: "destructive" })
      return
    }
    if (!title.trim()) {
      toast({ title: "Validação", description: "Título é obrigatório", variant: "destructive" })
      return
    }
    if (!description.trim()) {
      toast({ title: "Validação", description: "Mensagem é obrigatória", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      await createMySupportTicket({
        company_id: companyId,
        title,
        description,
        priority,
        category_id: null,
        department_id: null,
        due_date: dueDate || null,
      })
      toast({ title: "Sucesso", description: "Ticket criado" })
      navigate("/me/support/tickets")
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Falha ao criar ticket", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (!isNew && loading) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title">Ticket</h1>
              <p className="page-subtitle">Suporte → Detalhes</p>
              <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
            </div>
            <Button asChild variant="outline"><Link to="/me/support/tickets"><ArrowLeft /> Voltar</Link></Button>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
    )
  }

  if (!isNew && ticket) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title">Ticket</h1>
              <p className="page-subtitle">Suporte → Detalhes</p>
              <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
            </div>
            <Button asChild variant="outline"><Link to="/me/support/tickets"><ArrowLeft /> Voltar</Link></Button>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <div className="text-lg font-semibold">{ticket.title}</div>
          <div className="text-sm text-muted-foreground">{ticket.description}</div>
          <div className="flex items-center gap-3 text-sm">
            <span>Status: {ticket.status}</span>
            <span className="text-muted-foreground">Prioridade: {ticket.priority}</span>
          </div>
          <div className="text-sm text-muted-foreground">ID: {ticket.id}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Novo Ticket</h1>
            <p className="page-subtitle">Suporte → Registo</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <Button asChild variant="outline"><Link to="/me/support/tickets"><ArrowLeft /> Voltar</Link></Button>
        </div>
      </div>

      <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Empresa</div>
          <Input value={companyId} onChange={(e) => setCompanyId(e.target.value)} placeholder="ID da empresa" />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Título</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Erro ao acessar" />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descreve o problema/solicitação…" />
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Prioridade</div>
          <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baixa</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="urgent">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Vence em</div>
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="md:col-span-2 flex justify-end">
          <Button type="button" onClick={submit} disabled={saving}>
            <Save />
            Guardar
          </Button>
        </div>
      </div>
    </div>
  )
}