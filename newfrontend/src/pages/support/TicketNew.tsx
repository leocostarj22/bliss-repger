import { useEffect, useMemo, useState } from "react"
import { ArrowLeft } from "lucide-react"
import { useNavigate, useSearchParams } from "react-router-dom"

import type { Company, Department, SupportCategory, SupportTicketPriority, SupportTicketStatus, User } from "@/types"
import { createSupportTicket, fetchCompanies, fetchDepartments, fetchSupportCategories, fetchUsers } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

const toLocalInput = (iso?: string | null) => (iso ? String(iso).slice(0, 16) : "")
const toIsoOrNull = (val: string) => (val ? new Date(val).toISOString() : null)

export default function SupportTicketNew() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [categories, setCategories] = useState<SupportCategory[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const prefillCompanyId = String(searchParams.get("company_id") ?? "").trim()
  const prefillDepartmentId = String(searchParams.get("department_id") ?? "").trim()
  const prefillAssignedTo = String(searchParams.get("assigned_to") ?? "").trim()

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

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCompanies(), fetchDepartments(), fetchSupportCategories(), fetchUsers()])
      .then(([comps, deps, cats, us]) => {
        setCompanies(comps.data)
        setDepartments(deps.data)
        setCategories(cats.data)
        setUsers(us.data)

        const firstCompany = String(comps.data?.[0]?.id ?? "")
        const nextCompany = prefillCompanyId || firstCompany
        setCompanyId(nextCompany)

        if (prefillDepartmentId) setDepartmentId(prefillDepartmentId)
        if (prefillAssignedTo) setAssignedTo(prefillAssignedTo)
      })
      .catch((e: any) => {
        toast({ title: "Erro", description: String(e?.message ?? "Não foi possível carregar dados"), variant: "destructive" })
      })
      .finally(() => setLoading(false))
  }, [prefillAssignedTo, prefillCompanyId, prefillDepartmentId, toast])

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
      await createSupportTicket({
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
      toast({ title: "Sucesso", description: "Ticket criado" })
      navigate("/support/tickets")
    } catch (e: any) {
      toast({ title: "Erro", description: String(e?.message ?? "Falha ao criar ticket"), variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="page-title">Novo ticket</h1>
            <p className="page-subtitle">Suporte → Tickets</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/support/tickets")}>
              <ArrowLeft />
              Voltar
            </Button>
            <Button type="button" onClick={submit} disabled={loading || saving}>
              {saving ? "A guardar…" : "Criar ticket"}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Empresa</div>
            <Select value={companyId} onValueChange={setCompanyId} disabled={loading || companies.length === 0}>
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
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Título</div>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Erro ao acessar" />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Mensagem</div>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} placeholder="Descreva o problema/solicitação…" />
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
    </div>
  )
}