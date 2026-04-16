import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, Paperclip, Save } from "lucide-react"

import type { Company, Department, SupportCategory, SupportTicket, SupportTicketPriority, User } from "@/types"
import {
  createMySupportTicket,
  fetchMyCompanies,
  fetchMyDepartments,
  fetchMyEmployee,
  fetchMySupportAssignees,
  fetchMySupportCategories,
  fetchMySupportTicket,
  updateMySupportTicket,
  uploadMySupportTicketAttachments,
} from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
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

  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<SupportCategory[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [companyId, setCompanyId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<SupportTicketPriority>("medium")
  const [categoryId, setCategoryId] = useState<string>("none")
  const [departmentId, setDepartmentId] = useState<string>("none")
  const [assignedTo, setAssignedTo] = useState<string>("none")
  const [dueDate, setDueDate] = useState<string>("")

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])

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

  useEffect(() => {
    let alive = true
    Promise.all([fetchMyCompanies(), fetchMyDepartments(), fetchMySupportCategories(), fetchMySupportAssignees()])
      .then(([cs, ds, cats, us]) => {
        if (!alive) return
        setCompanies(cs.data)
        setDepartments(ds.data)
        setCategories(cats.data)
        setUsers(us.data)
      })
      .catch((e: any) => {
        if (!alive) return
        toast({ title: "Erro", description: e?.message ?? "Não foi possível carregar dados do suporte", variant: "destructive" })
      })
    return () => {
      alive = false
    }
  }, [toast])

  const categoriesForCompany = useMemo(() => categories.filter((c) => c.company_id === companyId), [categories, companyId])
  const departmentsForCompany = useMemo(() => departments.filter((d) => d.company_id === companyId), [departments, companyId])
  const assigneesForCompany = useMemo(() => users, [users])
  const companyName = useMemo(() => companies.find((c) => c.id === companyId)?.name ?? "", [companies, companyId])

  useEffect(() => {
    if (categoryId !== "none" && !categoriesForCompany.some((c) => c.id === categoryId)) setCategoryId("none")
  }, [categoryId, categoriesForCompany])

  useEffect(() => {
    if (departmentId !== "none" && !departmentsForCompany.some((d) => d.id === departmentId)) setDepartmentId("none")
  }, [departmentId, departmentsForCompany])

  useEffect(() => {
    if (assignedTo !== "none" && !assigneesForCompany.some((u) => u.id === assignedTo)) setAssignedTo("none")
  }, [assignedTo, assigneesForCompany])

  const isNew = useMemo(() => !id, [id])

  useEffect(() => {
    if (!ticket) return
    setCompanyId(String(ticket.company_id ?? ""))
    setTitle(ticket.title ?? "")
    setDescription(ticket.description ?? "")
    setPriority((ticket.priority ?? "medium") as any)
    setCategoryId(ticket.category_id ? String(ticket.category_id) : "none")
    setDepartmentId(ticket.department_id ? String(ticket.department_id) : "none")
    setAssignedTo(ticket.assigned_to ? String(ticket.assigned_to) : "none")
    setDueDate(ticket.due_date ? String(ticket.due_date).slice(0, 16) : "")
  }, [ticket])

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
      if (isNew) {
        const created = await createMySupportTicket({
          company_id: companyId,
          title,
          description,
          priority,
          category_id: categoryId === "none" ? null : categoryId,
          department_id: departmentId === "none" ? null : departmentId,
          assigned_to: assignedTo === "none" ? null : assignedTo,
          due_date: dueDate || null,
        })

        if (files.length > 0) {
          await uploadMySupportTicketAttachments(created.data.id, files)
          setFiles([])
        }

        toast({ title: "Sucesso", description: "Ticket criado" })
        navigate("/me/support/tickets")
        return
      }

      if (!ticket) {
        toast({ title: "Erro", description: "Ticket não carregado", variant: "destructive" })
        return
      }

      const updated = await updateMySupportTicket(ticket.id, {
        title,
        description,
        priority,
        category_id: categoryId === "none" ? null : categoryId,
        department_id: departmentId === "none" ? null : departmentId,
        assigned_to: assignedTo === "none" ? null : assignedTo,
        due_date: dueDate || null,
      })

      if (files.length > 0) {
        await uploadMySupportTicketAttachments(updated.data.id, files)
        setFiles([])
      }

      setTicket(updated.data)
      toast({ title: "Sucesso", description: "Ticket atualizado" })
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
              <p className="page-subtitle">Suporte → Editar</p>
              <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
            </div>
            <Button asChild variant="outline"><Link to="/me/support/tickets"><ArrowLeft /> Voltar</Link></Button>
          </div>
        </div>

        <div className="glass-card p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Input value={companyName || companyId} disabled />
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
              placeholder="Escreve a mensagem…"
              onImageUpload={async (file) => {
                if (!ticket?.id) {
                  toast({ title: "Aviso", description: "Guarde o ticket antes de inserir imagens no texto.", variant: "default" })
                  throw new Error("Ticket ainda não foi guardado")
                }

                const res = await uploadMySupportTicketAttachments(ticket.id, [file])
                const att = Array.isArray(res.data) ? res.data[0] : null
                if (!att?.id) {
                  throw new Error("Upload falhou")
                }
                return `/tickets/attachments/${att.id}/view`
              }}
            />
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
            <div className="text-xs text-muted-foreground mb-1">Categoria</div>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem categoria</SelectItem>
                {categoriesForCompany.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Departamento</div>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger><SelectValue placeholder="Sem departamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem departamento</SelectItem>
                {departmentsForCompany.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Atribuição</div>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger><SelectValue placeholder="Sem atribuição" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem atribuição</SelectItem>
                {assigneesForCompany.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Vence em</div>
            <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              style={{ display: "none" }}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
            />

            <div className="flex items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Paperclip />
                Anexar ficheiros
              </Button>
              <div className="text-xs text-muted-foreground">{files.length ? `${files.length} ficheiro(s) selecionado(s)` : ""}</div>
            </div>
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
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleciona a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Título</div>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Erro ao acessar" />
        </div>

        <div className="md:col-span-2">
          <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
          <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Descreve o problema/solicitação…"
              onImageUpload={async () => {
                toast({ title: "Aviso", description: "Crie o ticket primeiro para inserir imagens no texto.", variant: "default" })
                throw new Error("Ticket ainda não foi guardado")
              }}
            />
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
          <div className="text-xs text-muted-foreground mb-1">Categoria</div>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger><SelectValue placeholder="Sem categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem categoria</SelectItem>
              {categoriesForCompany.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Departamento</div>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger><SelectValue placeholder="Sem departamento" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem departamento</SelectItem>
              {departmentsForCompany.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Atribuição</div>
          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger><SelectValue placeholder="Sem atribuição" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem atribuição</SelectItem>
              {assigneesForCompany.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-xs text-muted-foreground mb-1">Vence em</div>
          <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="md:col-span-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            style={{ display: "none" }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip,.rar"
          />

          <div className="flex items-center justify-between gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Paperclip />
              Anexar ficheiros
            </Button>
            <div className="text-xs text-muted-foreground">{files.length ? `${files.length} ficheiro(s) selecionado(s)` : ""}</div>
          </div>
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