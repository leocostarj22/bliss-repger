import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Paperclip, Save, Trash2 } from "lucide-react"

import type { Company, Department, Employee, EmployeeStatus } from "@/types"
import { createEmployee, fetchCompanies, fetchDepartments, fetchEmployee, updateEmployee } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"

const CLEAR_SELECT_VALUE = "__clear__"

type EmployeeDocument = {
  id: string
  name: string
  mime: string
  size: number
  uploaded_at: string
}

const normalizeEmployeeDocuments = (input: unknown): EmployeeDocument[] => {
  const arr = Array.isArray(input) ? input : []
  return arr
    .map((d: any, idx) => {
      const name = String(d?.name ?? d?.filename ?? "Documento")
      return {
        id: String(d?.id ?? `doc_${idx}`),
        name,
        mime: String(d?.mime ?? d?.type ?? "application/octet-stream"),
        size: Number.isFinite(Number(d?.size)) ? Number(d?.size) : 0,
        uploaded_at: String(d?.uploaded_at ?? d?.createdAt ?? new Date().toISOString()),
      }
    })
    .filter((d) => d.name.trim())
}

type FormState = {
  employee_code: string
  name: string
  email: string
  system_email: string
  system_password: string
  has_system_access: boolean
  nif: string
  document_type: string
  document_number: string
  document_expiration_date: string
  nis: string
  birth_date: string
  gender: string
  nationality: string
  marital_status: string
  spouse_name: string
  spouse_nif: string
  spouse_joint_irs: boolean
  has_children: boolean
  children_data_text: string
  phone: string
  emergency_contact: string
  emergency_phone: string
  address: string
  address_number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  zip_code: string
  position: string
  department_id: string
  company_id: string
  hire_date: string
  termination_date: string
  salary: string
  hourly_rate: string
  vacation_days_balance: string
  last_vacation_calculation: string
  employment_type: string
  contract_duration: string
  auto_renew: boolean
  status: EmployeeStatus
  bank_name: string
  bank_agency: string
  bank_account: string
  account_type: string
  notes: string
  photo_path: string
  has_disability: boolean
  disability_declarant: boolean
  disability_spouse: boolean
  disability_dependents: string
  medical_aptitude_date: string
  medical_status: "active" | "inactive"
}

const emptyForm = (): FormState => ({
  employee_code: "",
  name: "",
  email: "",
  system_email: "",
  system_password: "",
  has_system_access: false,
  nif: "",
  document_type: "",
  document_number: "",
  document_expiration_date: "",
  nis: "",
  birth_date: "",
  gender: "",
  nationality: "PT",
  marital_status: "",
  spouse_name: "",
  spouse_nif: "",
  spouse_joint_irs: false,
  has_children: false,
  children_data_text: "[]",
  phone: "",
  emergency_contact: "",
  emergency_phone: "",
  address: "",
  address_number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  zip_code: "",
  position: "",
  department_id: "",
  company_id: "",
  hire_date: "",
  termination_date: "",
  salary: "",
  hourly_rate: "",
  vacation_days_balance: "",
  last_vacation_calculation: "",
  employment_type: "",
  contract_duration: "",
  auto_renew: false,
  status: "active",
  bank_name: "",
  bank_agency: "",
  bank_account: "",
  account_type: "",
  notes: "",
  photo_path: "",
  has_disability: false,
  disability_declarant: false,
  disability_spouse: false,
  disability_dependents: "0",
  medical_aptitude_date: "",
  medical_status: "active",
})

const toDateInput = (value?: string | null) => (value ?? "").slice(0, 10)

export default function EmployeeForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [form, setForm] = useState<FormState>(() => emptyForm())
  const [dossierDocuments, setDossierDocuments] = useState<EmployeeDocument[]>([])
  const [documentsInputKey, setDocumentsInputKey] = useState(0)
  const [photoInputKey, setPhotoInputKey] = useState(0)

  const title = isEdit ? "Editar funcionário" : "Novo funcionário"

  const addDocuments = useCallback(
    (files: FileList | null) => {
      const list = files ? Array.from(files) : []
      if (!list.length) return

      const now = new Date().toISOString()
      const next = list.map((f) => ({
        id: `doc_${Math.random().toString(16).slice(2)}`,
        name: f.name,
        mime: f.type || "application/octet-stream",
        size: f.size,
        uploaded_at: now,
      }))

      setDossierDocuments((prev) => [...prev, ...next])
      setDocumentsInputKey((k) => k + 1)

      toast({
        title: "Documentos adicionados",
        description: `${next.length} ficheiro(s) anexado(s) ao dossiê (metadados no mock).`,
      })
    },
    [toast],
  )

  const removeDocument = useCallback((docId: string) => {
    setDossierDocuments((prev) => prev.filter((d) => d.id !== docId))
  }, [])

  const setField = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchCompanies(), fetchDepartments(), isEdit && id ? fetchEmployee(id) : Promise.resolve(null)])
      .then(([comps, deps, empResp]) => {
        setCompanies(comps.data)
        setDepartments(deps.data)

        if (empResp?.data) {
          const e = empResp.data
          setForm({
            employee_code: String(e.employee_code ?? ""),
            name: String(e.name ?? ""),
            email: String(e.email ?? ""),
            system_email: String(e.system_email ?? e.email ?? ""),
            system_password: "",
            has_system_access: Boolean(e.has_system_access),
            nif: String(e.nif ?? ""),
            document_type: String(e.document_type ?? ""),
            document_number: String(e.document_number ?? ""),
            document_expiration_date: toDateInput(e.document_expiration_date),
            nis: String(e.nis ?? ""),
            birth_date: toDateInput(e.birth_date),
            gender: String(e.gender ?? ""),
            nationality: String(e.nationality ?? ""),
            marital_status: String(e.marital_status ?? ""),
            spouse_name: String(e.spouse_name ?? ""),
            spouse_nif: String(e.spouse_nif ?? ""),
            spouse_joint_irs: Boolean(e.spouse_joint_irs),
            has_children: Boolean(e.has_children),
            children_data_text: JSON.stringify(e.children_data ?? [], null, 2),
            phone: String(e.phone ?? ""),
            emergency_contact: String(e.emergency_contact ?? ""),
            emergency_phone: String(e.emergency_phone ?? ""),
            address: String(e.address ?? ""),
            address_number: String(e.address_number ?? ""),
            complement: String(e.complement ?? ""),
            neighborhood: String(e.neighborhood ?? ""),
            city: String(e.city ?? ""),
            state: String(e.state ?? ""),
            zip_code: String(e.zip_code ?? ""),
            position: String(e.position ?? ""),
            department_id: String(e.department_id ?? ""),
            company_id: String(e.company_id ?? ""),
            hire_date: toDateInput(e.hire_date),
            termination_date: toDateInput(e.termination_date),
            salary: e.salary === null || e.salary === undefined ? "" : String(e.salary),
            hourly_rate: e.hourly_rate === null || e.hourly_rate === undefined ? "" : String(e.hourly_rate),
            vacation_days_balance: e.vacation_days_balance === null || e.vacation_days_balance === undefined ? "" : String(e.vacation_days_balance),
            last_vacation_calculation: toDateInput(e.last_vacation_calculation),
            employment_type: String(e.employment_type ?? ""),
            contract_duration: e.contract_duration === null || e.contract_duration === undefined ? "" : String(e.contract_duration),
            auto_renew: Boolean(e.auto_renew),
            status: (e.status ?? "active") as EmployeeStatus,
            bank_name: String(e.bank_name ?? ""),
            bank_agency: String(e.bank_agency ?? ""),
            bank_account: String(e.bank_account ?? ""),
            account_type: String(e.account_type ?? ""),
            notes: String(e.notes ?? ""),
            photo_path: String(e.photo_path ?? ""),
            has_disability: Boolean(e.has_disability),
            disability_declarant: Boolean(e.disability_declarant),
            disability_spouse: Boolean(e.disability_spouse),
            disability_dependents: e.disability_dependents === null || e.disability_dependents === undefined ? "0" : String(e.disability_dependents),
            medical_aptitude_date: toDateInput(e.medical_aptitude_date),
            medical_status: e.medical_status === "active" || e.medical_status === "inactive" ? e.medical_status : "",
          })
          setDossierDocuments(normalizeEmployeeDocuments(e.documents))
          return
        }

        setForm((prev) => ({
          ...prev,
          company_id: prev.company_id || comps.data[0]?.id || "",
        }))
      })
      .catch(() => {
        if (isEdit) {
          toast({ title: "Erro", description: "Funcionário não encontrado", variant: "destructive" })
          navigate("/hr/employees", { replace: true })
        }
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, toast])

  const filteredDepartments = useMemo(() => {
    if (!form.company_id) return departments
    return departments.filter((d) => d.company_id === form.company_id)
  }, [departments, form.company_id])

  useEffect(() => {
    if (!form.company_id) return
    if (!form.department_id) return
    const dep = departments.find((d) => d.id === form.department_id)
    if (dep && dep.company_id !== form.company_id) setField("department_id", "")
  }, [departments, form.company_id, form.department_id, setField])

  const parseJson = (raw: string) => {
    const value = raw.trim()
    if (!value) return []
    return JSON.parse(value)
  }

  const safeChildrenData = useMemo(() => {
    try {
      const parsed = parseJson(form.children_data_text)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }, [form.children_data_text])

  const medicalRenewalText = useMemo(() => {
    const aptitudeDate = form.medical_aptitude_date
    const birthDate = form.birth_date

    if (!aptitudeDate || !birthDate) return "Aguardando dados (Nascimento e Aptidão)…"

    try {
      const birth = new Date(`${birthDate}T00:00:00`)
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age -= 1

      const years = age > 50 ? 1 : 2
      const [y, mo, d] = aptitudeDate.slice(0, 10).split("-")
      const next = new Date(`${aptitudeDate}T00:00:00`)
      next.setFullYear(next.getFullYear() + years)
      const nextIso = next.toISOString().slice(0, 10)
      const [ny, nmo, nd] = nextIso.split("-")

      return `Renovação em ${years} ano(s) (${nd}/${nmo}/${ny})`
    } catch {
      return "Erro ao calcular renovação"
    }
  }, [form.birth_date, form.medical_aptitude_date])

  const toNumberOrNull = (raw: string) => {
    const v = raw.trim()
    if (!v) return null
    const n = Number(v.replace(",", "."))
    return Number.isFinite(n) ? n : null
  }

  const toIntOrNull = (raw: string) => {
    const v = raw.trim()
    if (!v) return null
    const n = Number(v)
    return Number.isFinite(n) ? Math.trunc(n) : null
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      toast({ title: "Validação", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    if (!isEdit) {
      if (!form.nif.trim()) {
        toast({ title: "Validação", description: "NIF é obrigatório", variant: "destructive" })
        return
      }
      if (!form.document_type.trim()) {
        toast({ title: "Validação", description: "Tipo de documento é obrigatório", variant: "destructive" })
        return
      }
      if (!form.document_number.trim()) {
        toast({ title: "Validação", description: "Número do documento é obrigatório", variant: "destructive" })
        return
      }
      if (!form.position.trim()) {
        toast({ title: "Validação", description: "Cargo é obrigatório", variant: "destructive" })
        return
      }
      if (!form.company_id) {
        toast({ title: "Validação", description: "Empresa é obrigatória", variant: "destructive" })
        return
      }
      if (!form.department_id) {
        toast({ title: "Validação", description: "Departamento é obrigatório", variant: "destructive" })
        return
      }
      if (!form.hire_date) {
        toast({ title: "Validação", description: "Data de admissão é obrigatória", variant: "destructive" })
        return
      }
    }

    const selectedDepartment = departments.find((d) => d.id === form.department_id)
    if (selectedDepartment && form.company_id && selectedDepartment.company_id !== form.company_id) {
      toast({ title: "Validação", description: "Departamento deve ser da mesma empresa", variant: "destructive" })
      return
    }

    let children_data: any[] = []

    if (form.has_children) {
      try {
        const parsed = parseJson(form.children_data_text)
        children_data = Array.isArray(parsed) ? (parsed as any[]) : []
      } catch {
        toast({ title: "Validação", description: "Dados dos filhos deve ser válido", variant: "destructive" })
        return
      }
    }

    const systemEmail = form.system_email.trim()
    const systemPassword = form.system_password.trim()
    const hasSystemAccess = form.has_system_access || Boolean(systemEmail && systemPassword)

    const payload: Omit<Employee, "id" | "createdAt" | "updatedAt"> = {
      employee_code: form.employee_code.trim() || null,
      name: form.name.trim(),
      email: form.email.trim() || null,
      system_email: hasSystemAccess ? (systemEmail || form.email.trim() || null) : null,
      has_system_access: hasSystemAccess,
      nif: form.nif.trim() || null,
      document_type: form.document_type.trim() || null,
      document_number: form.document_number.trim() || null,
      document_expiration_date: form.document_expiration_date || null,
      nis: form.nis.trim() || null,
      birth_date: form.birth_date || null,
      gender: form.gender.trim() || null,
      nationality: form.nationality.trim() || null,
      marital_status: form.marital_status.trim() || null,
      spouse_name: form.spouse_name.trim() || null,
      spouse_nif: form.spouse_nif.trim() || null,
      spouse_joint_irs: form.spouse_joint_irs,
      has_children: form.has_children,
      children_data,
      phone: form.phone.trim() || null,
      emergency_contact: form.emergency_contact.trim() || null,
      emergency_phone: form.emergency_phone.trim() || null,
      address: form.address.trim() || null,
      address_number: form.address_number.trim() || null,
      complement: form.complement.trim() || null,
      neighborhood: form.neighborhood.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      zip_code: form.zip_code.trim() || null,
      position: form.position.trim() || null,
      department_id: form.department_id || null,
      company_id: form.company_id || null,
      hire_date: form.hire_date || null,
      termination_date: form.termination_date || null,
      salary: toNumberOrNull(form.salary),
      hourly_rate: toNumberOrNull(form.hourly_rate),
      vacation_days_balance: toIntOrNull(form.vacation_days_balance),
      last_vacation_calculation: form.last_vacation_calculation || null,
      employment_type: form.employment_type.trim() || null,
      contract_duration: toIntOrNull(form.contract_duration),
      auto_renew: form.auto_renew,
      status: form.status,
      bank_name: form.bank_name.trim() || null,
      bank_agency: form.bank_agency.trim() || null,
      bank_account: form.bank_account.trim() || null,
      account_type: form.account_type.trim() || null,
      notes: form.notes.trim() || null,
      photo_path: form.photo_path.trim() || null,
      has_disability: form.has_disability,
      disability_declarant: form.disability_declarant,
      disability_spouse: form.disability_spouse,
      disability_dependents: toIntOrNull(form.disability_dependents),
      documents: dossierDocuments,
      medical_aptitude_date: form.medical_aptitude_date || null,
      medical_status: form.medical_status || null,
    }

    setSaving(true)
    try {
      if (isEdit && id) {
        const resp = await updateEmployee(id, payload)
        toast({ title: "Guardado", description: "Funcionário atualizado" })
        navigate(`/hr/employees/${resp.data.id}`)
      } else {
        const resp = await createEmployee(payload)
        toast({ title: "Criado", description: "Funcionário criado" })
        navigate(`/hr/employees/${resp.data.id}`)
      }
    } catch (err) {
      const msg = err instanceof Error && err.message.trim() ? err.message : "Não foi possível guardar o funcionário"
      toast({ title: "Erro", description: msg, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Recursos Humanos → Funcionários</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">Recursos Humanos → Funcionários</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to={isEdit && id ? `/hr/employees/${id}` : "/hr/employees"}>
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button type="submit" form="employee-form" disabled={saving || !form.name.trim()}>
              <Save />
              {saving ? "A guardar…" : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <form id="employee-form" onSubmit={onSubmit} className="glass-card p-6 space-y-6">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="w-full justify-start flex-wrap">
            <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
            <TabsTrigger value="address">Endereço</TabsTrigger>
            <TabsTrigger value="professional">Dados Profissionais</TabsTrigger>
            <TabsTrigger value="bank">Dados Bancários</TabsTrigger>
            <TabsTrigger value="notes">Observações</TabsTrigger>
            <TabsTrigger value="medicine">Medicina do Trabalho</TabsTrigger>
            <TabsTrigger value="documents">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="personal">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="lg:col-span-2">
                <div className="text-sm font-semibold">Informações Básicas</div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Código do Funcionário</label>
                <Input value={form.employee_code} onChange={(e) => setField("employee_code", e.target.value)} placeholder="Auto (EMP001…)" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Foto</label>
                <Input
                  key={photoInputKey}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return

                    if (!file.type.startsWith("image/")) {
                      toast({ title: "Erro", description: "Selecione um ficheiro de imagem.", variant: "destructive" })
                      setPhotoInputKey((k) => k + 1)
                      return
                    }

                    const maxBytes = 2 * 1024 * 1024
                    if (file.size > maxBytes) {
                      toast({ title: "Erro", description: "A imagem deve ter no máximo 2MB.", variant: "destructive" })
                      setPhotoInputKey((k) => k + 1)
                      return
                    }

                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = reader.result
                      if (typeof result === "string") {
                        setField("photo_path", result)
                        setPhotoInputKey((k) => k + 1)
                        return
                      }
                      toast({ title: "Erro", description: "Não foi possível ler a imagem.", variant: "destructive" })
                      setPhotoInputKey((k) => k + 1)
                    }
                    reader.onerror = () => {
                      toast({ title: "Erro", description: "Falha ao ler a imagem.", variant: "destructive" })
                      setPhotoInputKey((k) => k + 1)
                    }
                    reader.readAsDataURL(file)
                  }}
                />

                {form.photo_path.trim() ? (
                  <div className="mt-2 flex items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
                    <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                      <img src={form.photo_path} alt="Foto" className="h-full w-full object-contain" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground truncate">
                        {form.photo_path.startsWith("data:") ? "Imagem carregada do computador" : form.photo_path}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome Completo</label>
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Nome completo" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Corporativo</label>
                <Input value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@empresa.com" />
              </div>

              <div className="lg:col-span-2 rounded-lg border border-border p-4">
                <div className="text-sm font-semibold">Acesso ao Sistema</div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      value={form.system_email}
                      onChange={(e) => setField("system_email", e.target.value)}
                      placeholder={form.email.trim() ? form.email.trim() : "email@empresa.com"}
                      autoComplete="off"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      value={form.system_password}
                      onChange={(e) => setField("system_password", e.target.value)}
                      placeholder={isEdit ? "Deixe em branco para manter" : "Defina uma password"}
                      autoComplete="new-password"
                    />
                  </div>

                  <div className="space-y-2 lg:col-span-2">
                    <label className="text-sm font-medium">Status</label>
                    <Input
                      value={
                        form.has_system_access
                          ? "Com acesso ao sistema"
                          : form.system_email.trim() && form.system_password.trim()
                            ? "Será criado ao guardar"
                            : "Sem acesso ao sistema"
                      }
                      disabled
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 rounded-lg border border-border p-4">
                <div className="text-sm font-semibold">Documentos</div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">NIF</label>
                    <Input value={form.nif} onChange={(e) => setField("nif", e.target.value)} placeholder="123456789" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo de Documento</label>
                    <Select value={form.document_type} onValueChange={(v) => setField("document_type", v === CLEAR_SELECT_VALUE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                        <SelectItem value="cartao_cidadao">Cartão de Cidadão</SelectItem>
                        <SelectItem value="titulo_residencia">Título de Residência</SelectItem>
                        <SelectItem value="passaporte">Passaporte</SelectItem>
                        <SelectItem value="bilhete_identidade">Bilhete de Identidade</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Número do Documento</label>
                    <Input value={form.document_number} onChange={(e) => setField("document_number", e.target.value)} placeholder="…" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Validade do Documento</label>
                    <Input type="date" value={form.document_expiration_date} onChange={(e) => setField("document_expiration_date", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">NIS</label>
                    <Input value={form.nis} onChange={(e) => setField("nis", e.target.value)} placeholder="…" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Nascimento</label>
                    <Input type="date" value={form.birth_date} onChange={(e) => setField("birth_date", e.target.value)} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Género</label>
                    <Select value={form.gender} onValueChange={(v) => setField("gender", v === CLEAR_SELECT_VALUE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                        <SelectItem value="M">Masculino</SelectItem>
                        <SelectItem value="F">Feminino</SelectItem>
                        <SelectItem value="Other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nacionalidade</label>
                    <Input value={form.nationality} onChange={(e) => setField("nationality", e.target.value)} placeholder="Português" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado Civil</label>
                    <Select
                      value={form.marital_status}
                      onValueChange={(v) => {
                        const next = v === CLEAR_SELECT_VALUE ? "" : v
                        setField("marital_status", next)
                        if (next !== "married") {
                          setField("spouse_name", "")
                          setField("spouse_nif", "")
                          setField("spouse_joint_irs", false)
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                        <SelectItem value="single">Solteiro(a)</SelectItem>
                        <SelectItem value="married">Casado(a)</SelectItem>
                        <SelectItem value="divorced">Divorciado(a)</SelectItem>
                        <SelectItem value="widowed">Viúvo(a)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {form.marital_status === "married" ? (
                    <>
                      <div className="space-y-2 lg:col-span-3">
                        <label className="text-sm font-medium">Nome do Cônjuge</label>
                        <Input value={form.spouse_name} onChange={(e) => setField("spouse_name", e.target.value)} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">NIF do Cônjuge</label>
                        <Input value={form.spouse_nif} onChange={(e) => setField("spouse_nif", e.target.value)} placeholder="123456789" />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-3">
                        <div>
                          <div className="text-sm font-medium">IRS em Conjunto?</div>
                          <div className="text-xs text-muted-foreground">spouse_joint_irs</div>
                        </div>
                        <Switch checked={form.spouse_joint_irs} onCheckedChange={(v) => setField("spouse_joint_irs", Boolean(v))} />
                      </div>
                    </>
                  ) : null}

                  <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-3">
                    <div>
                      <div className="text-sm font-medium">Tem Filhos?</div>
                      <div className="text-xs text-muted-foreground">has_children</div>
                    </div>
                    <Switch
                      checked={form.has_children}
                      onCheckedChange={(v) => {
                        const next = Boolean(v)
                        setField("has_children", next)
                        if (!next) setField("children_data_text", "[]")
                      }}
                    />
                  </div>

                  {form.has_children ? (
                    <div className="space-y-2 lg:col-span-3">
                      <label className="text-sm font-medium">Dados dos Filhos</label>
                      <div className="rounded-lg border border-border p-4 space-y-3">
                        {safeChildrenData.length === 0 ? (
                          <div className="text-xs text-muted-foreground">Sem filhos registados</div>
                        ) : (
                          <div className="space-y-3">
                            {safeChildrenData.map((child: any, idx: number) => (
                              <div key={idx} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Nome</label>
                                  <Input
                                    value={String(child?.name ?? "")}
                                    onChange={(e) => {
                                      const next = safeChildrenData.map((c: any, i: number) => (i === idx ? { ...c, name: e.target.value } : c))
                                      setField("children_data_text", JSON.stringify(next, null, 2))
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">Data de Nascimento</label>
                                  <Input
                                    type="date"
                                    value={String(child?.birth_date ?? "").slice(0, 10)}
                                    onChange={(e) => {
                                      const next = safeChildrenData.map((c: any, i: number) => (i === idx ? { ...c, birth_date: e.target.value } : c))
                                      setField("children_data_text", JSON.stringify(next, null, 2))
                                    }}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-xs text-muted-foreground">NIF</label>
                                  <div className="flex items-center gap-2">
                                    <Input
                                      value={String(child?.nif ?? "")}
                                      onChange={(e) => {
                                        const next = safeChildrenData.map((c: any, i: number) => (i === idx ? { ...c, nif: e.target.value } : c))
                                        setField("children_data_text", JSON.stringify(next, null, 2))
                                      }}
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        const next = safeChildrenData.filter((_: any, i: number) => i !== idx)
                                        setField("children_data_text", JSON.stringify(next, null, 2))
                                      }}
                                    >
                                      <Trash2 />
                                      Remover
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const next = [...safeChildrenData, { name: "", birth_date: "", nif: "" }]
                              setField("children_data_text", JSON.stringify(next, null, 2))
                            }}
                          >
                            Adicionar filho
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between rounded-lg border border-border p-4 lg:col-span-3">
                    <div>
                      <div className="text-sm font-medium">Deficiente</div>
                      <div className="text-xs text-muted-foreground">Elementos do agregado familiar com grau de deficiência igual ou superior a 60%.</div>
                    </div>
                    <Switch
                      checked={form.has_disability}
                      onCheckedChange={(v) => {
                        const next = Boolean(v)
                        setField("has_disability", next)
                        if (!next) {
                          setField("disability_declarant", false)
                          setField("disability_spouse", false)
                          setField("disability_dependents", "0")
                        }
                      }}
                    />
                  </div>

                  {form.has_disability ? (
                    <>
                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <div className="text-sm font-medium">Declarante</div>
                          <div className="text-xs text-muted-foreground">disability_declarant</div>
                        </div>
                        <Switch checked={form.disability_declarant} onCheckedChange={(v) => setField("disability_declarant", Boolean(v))} />
                      </div>

                      <div className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <div className="text-sm font-medium">Cônjuge</div>
                          <div className="text-xs text-muted-foreground">disability_spouse</div>
                        </div>
                        <Switch checked={form.disability_spouse} onCheckedChange={(v) => setField("disability_spouse", Boolean(v))} />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dependentes</label>
                        <Input value={form.disability_dependents} onChange={(e) => setField("disability_dependents", e.target.value)} placeholder="0" />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="lg:col-span-2 rounded-lg border border-border p-4">
                <div className="text-sm font-semibold">Contato</div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone</label>
                    <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="912 345 678" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contato de Emergência</label>
                    <Input value={form.emergency_contact} onChange={(e) => setField("emergency_contact", e.target.value)} placeholder="Nome" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefone de Emergência</label>
                    <Input value={form.emergency_phone} onChange={(e) => setField("emergency_phone", e.target.value)} placeholder="912 345 678" />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="address">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">CEP</label>
                <Input value={form.zip_code} onChange={(e) => setField("zip_code", e.target.value)} placeholder="1000-000" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endereço</label>
                <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Rua/Avenida" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Número</label>
                <Input value={form.address_number} onChange={(e) => setField("address_number", e.target.value)} placeholder="10" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Complemento</label>
                <Input value={form.complement} onChange={(e) => setField("complement", e.target.value)} placeholder="3º D" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Freguesia</label>
                <Input value={form.neighborhood} onChange={(e) => setField("neighborhood", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Cidade</label>
                <Input value={form.city} onChange={(e) => setField("city", e.target.value)} placeholder="Lisboa" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Distrito</label>
                <Input value={form.state} onChange={(e) => setField("state", e.target.value)} placeholder="Lisboa" />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="professional">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Cargo</label>
                <Input value={form.position} onChange={(e) => setField("position", e.target.value)} placeholder="Ex.: Analista" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <Select
                  value={form.company_id}
                  onValueChange={(v) => {
                    const next = v === CLEAR_SELECT_VALUE ? "" : v
                    setField("company_id", next)
                    setField("department_id", "")
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a empresa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select value={form.department_id} onValueChange={(v) => setField("department_id", v === CLEAR_SELECT_VALUE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                    {filteredDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={String(form.status)} onValueChange={(v) => setField("status", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="on_leave">Afastado</SelectItem>
                    <SelectItem value="terminated">Cessado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Admissão</label>
                <Input type="date" value={form.hire_date} onChange={(e) => setField("hire_date", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Demissão</label>
                <Input type="date" value={form.termination_date} onChange={(e) => setField("termination_date", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Salário Base</label>
                <Input value={form.salary} onChange={(e) => setField("salary", e.target.value)} placeholder="1450.00" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Contrato</label>
                <Select
                  value={form.employment_type}
                  onValueChange={(v) => {
                    const next = v === CLEAR_SELECT_VALUE ? "" : v
                    setField("employment_type", next)
                    if (next !== "Temporary") {
                      setField("contract_duration", "")
                      setField("auto_renew", false)
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                    <SelectItem value="CLT">Contrato sem Termo</SelectItem>
                    <SelectItem value="PJ">Prestação de Serviços</SelectItem>
                    <SelectItem value="Intern">Estagiário</SelectItem>
                    <SelectItem value="Temporary">Contrato a Termo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.employment_type === "Temporary" ? (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duração do Contrato (Meses)</label>
                    <Select value={form.contract_duration} onValueChange={(v) => setField("contract_duration", v === CLEAR_SELECT_VALUE ? "" : v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                        <SelectItem value="6">6 Meses</SelectItem>
                        <SelectItem value="7">7 Meses</SelectItem>
                        <SelectItem value="12">12 Meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <div className="text-sm font-medium">Renovação Automática</div>
                      <div className="text-xs text-muted-foreground">auto_renew</div>
                    </div>
                    <Switch checked={form.auto_renew} onCheckedChange={(v) => setField("auto_renew", Boolean(v))} />
                  </div>
                </>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="bank">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Banco</label>
                <Input value={form.bank_name} onChange={(e) => setField("bank_name", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Agência</label>
                <Input value={form.bank_agency} onChange={(e) => setField("bank_agency", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">IBAN</label>
                <Input value={form.bank_account} onChange={(e) => setField("bank_account", e.target.value)} placeholder="PT50000000000000000000000" />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Conta</label>
                <Select value={form.account_type} onValueChange={(v) => setField("account_type", v === CLEAR_SELECT_VALUE ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={CLEAR_SELECT_VALUE}>—</SelectItem>
                    <SelectItem value="checking">Conta à Ordem</SelectItem>
                    <SelectItem value="savings">Conta Poupança</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="medicine">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Data de Aptidão</label>
                <Input type="date" value={form.medical_aptitude_date} onChange={(e) => setField("medical_aptitude_date", e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.medical_status} onValueChange={(v) => setField("medical_status", v as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border border-border p-4 text-sm lg:col-span-2">
                <div className="text-xs text-muted-foreground">Renovação</div>
                <div className="mt-1 font-medium">{medicalRenewalText}</div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Documentos (dossiê)</label>
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    key={documentsInputKey}
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
                    onChange={(e) => addDocuments(e.target.files)}
                  />
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap inline-flex items-center gap-2">
                  <Paperclip className="w-4 h-4" />
                  PDF · Word · Excel · Imagens
                </div>
              </div>

              {dossierDocuments.length === 0 ? (
                <div className="text-xs text-muted-foreground">Nenhum documento anexado</div>
              ) : (
                <div className="space-y-2">
                  {dossierDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{doc.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {doc.mime} · {Math.max(0, Math.round(doc.size / 1024))} KB
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => removeDocument(doc.id)}>
                        <Trash2 />
                        Remover
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
          </TabsContent>

          <TabsContent value="notes">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-2 lg:col-span-2">
            <label className="text-sm font-medium">Observações</label>
            <Textarea value={form.notes} onChange={(e) => setField("notes", e.target.value)} placeholder="Notas internas" className="min-h-[120px]" />
          </div>
        </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}