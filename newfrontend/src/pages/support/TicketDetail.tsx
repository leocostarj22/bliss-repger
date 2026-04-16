import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Save } from "lucide-react"
import { Link, useNavigate, useParams } from "react-router-dom"

import type { Company, Department, SupportCategory, SupportTicket, SupportTicketComment, SupportTicketPriority, SupportTicketStatus, User } from "@/types"
import {
  createSupportTicketComment,
  fetchCompanies,
  fetchDepartments,
  fetchSupportCategories,
  fetchSupportTicket,
  fetchSupportTicketComments,
  fetchUsers,
  updateSupportTicket,
  uploadSupportInlineImage,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Skeleton } from "@/components/ui/skeleton"
import { RichTextEditor } from "@/components/ui/rich-text-editor"

const toLocalInput = (iso?: string | null) => (iso ? String(iso).slice(0, 16) : "")
const toIsoOrNull = (val: string) => (val ? new Date(val).toISOString() : null)

export default function SupportTicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<SupportCategory[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [companyId, setCompanyId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<SupportTicketStatus>("open")
  const [priority, setPriority] = useState<SupportTicketPriority>("medium")
  const [categoryId, setCategoryId] = useState<string>("none")
  const [departmentId, setDepartmentId] = useState<string>("none")
  const [assignedTo, setAssignedTo] = useState<string>("none")
  const [dueDate, setDueDate] = useState<string>("")
  const [resolvedAt, setResolvedAt] = useState<string>("")

  const [comments, setComments] = useState<SupportTicketComment[]>([])
  const [reply, setReply] = useState("")
  const [replySaving, setReplySaving] = useState(false)

  useEffect(() => {
    let alive = true
    const ticketId = String(id ?? "").trim()
    if (!ticketId) {
      navigate("/support/tickets", { replace: true })
      return
    }

    setLoading(true)
    Promise.all([fetchSupportTicket(ticketId), fetchSupportTicketComments(ticketId), fetchCompanies(), fetchDepartments(), fetchSupportCategories(), fetchUsers()] as const)
      .then(([t, cms, comps, deps, cats, us]) => {
        if (!alive) return
        setTicket(t.data)
        setComments(Array.isArray(cms.data) ? cms.data : [])
        setCompanies(comps.data)
        setDepartments(deps.data)
        setCategories(cats.data)
        setUsers(us.data)

        setCompanyId(String(t.data.company_id ?? ""))
        setTitle(t.data.title ?? "")
        setDescription(t.data.description ?? "")
        setStatus((t.data.status ?? "open") as any)
        setPriority((t.data.priority ?? "medium") as any)
        setCategoryId(t.data.category_id ? String(t.data.category_id) : "none")
        setDepartmentId(t.data.department_id ? String(t.data.department_id) : "none")
        setAssignedTo(t.data.assigned_to ? String(t.data.assigned_to) : "none")
        setDueDate(toLocalInput(t.data.due_date))
        setResolvedAt(toLocalInput(t.data.resolved_at))
      })
      .catch((e: any) => {
        if (!alive) return
        toast({ title: "Erro", description: String(e?.message ?? "Não foi possível carregar o ticket"), variant: "destructive" })
      })
      .finally(() => {
        if (!alive) return
        setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [id, navigate, toast])

  const categoriesForCompany = useMemo(() => categories.filter((c) => c.company_id === companyId), [categories, companyId])
  const departmentsForCompany = useMemo(() => departments.filter((d) => d.company_id === companyId), [departments, companyId])

  useEffect(() => {
    if (categoryId !== "none" && !categoriesForCompany.some((c) => c.id === categoryId)) setCategoryId("none")
  }, [categoryId, categoriesForCompany])

  useEffect(() => {
    if (departmentId !== "none" && !departmentsForCompany.some((d) => d.id === departmentId)) setDepartmentId("none")
  }, [departmentId, departmentsForCompany])

  useEffect(() => {
    if (assignedTo !== "none" && !users.some((u) => u.id === assignedTo)) setAssignedTo("none")
  }, [assignedTo, users])

  useEffect(() => {
    if (status !== "resolved") setResolvedAt("")
  }, [status])

  const submit = async () => {
    if (!ticket?.id) return
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
      const res = await updateSupportTicket(ticket.id, {
        company_id: companyId,
        title,
        description,
        status,
        priority,
        category_id: categoryId === "none" ? null : categoryId,
        department_id: departmentId === "none" ? null : departmentId,
        assigned_to: assignedTo === "none" ? null : assignedTo,
        due_date: dueDate ? toIsoOrNull(dueDate) : null,
        resolved_at: status === "resolved" ? (resolvedAt ? toIsoOrNull(resolvedAt) : null) : null,
      })
      setTicket(res.data)
      toast({ title: "Sucesso", description: "Ticket atualizado" })
    } catch (e: any) {
      toast({ title: "Erro", description: String(e?.message ?? "Falha ao atualizar ticket"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const submitReply = async () => {
    if (!ticket?.id) return
    if (!reply.trim()) {
      toast({ title: "Validação", description: "Escreva uma resposta", variant: "destructive" })
      return
    }

    setReplySaving(true)
    try {
      const res = await createSupportTicketComment(ticket.id, reply)
      setComments((prev) => [...prev, res.data])
      setReply("")
      toast({ title: "Sucesso", description: "Resposta enviada" })
    } catch (e: any) {
      toast({ title: "Erro", description: String(e?.message ?? "Falha ao responder"), variant: "destructive" })
    } finally {
      setReplySaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="page-title">Ticket</h1>
              <p className="page-subtitle">Suporte → Detalhes</p>
              <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
            </div>
            <Button asChild variant="outline">
              <Link to="/support/tickets">
                <ArrowLeft /> Voltar
              </Link>
            </Button>
          </div>
        </div>

        <div className="glass-card p-4 space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Ticket</h1>
          <p className="page-subtitle">Suporte</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">Ticket não encontrado.</div>
        </div>
      </div>
    )
  }

  const companyName = companies.find((c) => c.id === companyId)?.name ?? ""
  const createdBy = String(ticket.creator_name ?? "").trim() || "—"

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">Ticket #{ticket.id}</h1>
            <p className="page-subtitle">Suporte → Detalhes</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link to="/support/tickets">
                <ArrowLeft /> Voltar
              </Link>
            </Button>
            <Button type="button" onClick={submit} disabled={saving}>
              <Save />
              Guardar
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="text-sm text-muted-foreground">Criado por: {createdBy}</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="Empresa" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {companyName ? null : <div className="text-xs text-muted-foreground mt-1">Empresa: {companyId}</div>}
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Descreva o problema/solicitação…"
              onImageUpload={async (file) => {
                const res = await uploadSupportInlineImage(file)
                return res.url
              }}
            />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Status</div>
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
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

          <div>
            <div className="text-xs text-muted-foreground mb-1">Categoria</div>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!companyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categoriesForCompany.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Departamento</div>
            <Select value={departmentId} onValueChange={setDepartmentId} disabled={!companyId}>
              <SelectTrigger>
                <SelectValue placeholder="Sem departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem departamento</SelectItem>
                {departmentsForCompany.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Atribuído a</div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Sem atribuição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem atribuição</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Vence em</div>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          {status === "resolved" ? (
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Resolvido em</div>
              <Input type="datetime-local" value={resolvedAt || toLocalInput(new Date().toISOString())} onChange={(e) => setResolvedAt(e.target.value)} />
            </div>
          ) : null}
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="text-sm font-medium">Respostas</div>

        <div className="space-y-3 max-h-[320px] overflow-auto">
          {comments.length === 0 ? (
            <div className="text-sm text-muted-foreground">Ainda sem respostas.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="rounded-md border border-border p-3">
                <div className="text-xs text-muted-foreground mb-1">
                  {c.author_name || "Utilizador"} • {c.created_at ? new Date(c.created_at).toLocaleString("pt-PT") : "—"}
                </div>
                <div className="text-sm whitespace-pre-wrap">{c.comment}</div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Responder</div>
          <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} placeholder="Escreva uma resposta…" />
          <div className="flex justify-end">
            <Button type="button" onClick={submitReply} disabled={replySaving}>
              {replySaving ? "A enviar…" : "Enviar resposta"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}