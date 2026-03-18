import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"

import type { Company, Department, Employee } from "@/types"
import { fetchCompanies, fetchDepartments, fetchEmployee } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

const badgeForStatus = (status?: string | null) => {
  if (status === "active") return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
  if (status === "inactive") return "bg-muted text-muted-foreground border-border"
  if (status === "on_leave") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  if (status === "terminated") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
  return "bg-muted text-muted-foreground border-border"
}

const statusLabel = (s?: string | null) => {
  if (s === "active") return "Ativo"
  if (s === "inactive") return "Inativo"
  if (s === "on_leave") return "Afastado"
  if (s === "terminated") return "Cessado"
  return s ? String(s) : "—"
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—"
  const raw = String(iso)
  const d = new Date(raw.length === 10 ? `${raw}T00:00:00` : raw)
  if (Number.isNaN(d.getTime())) return raw
  return d.toLocaleDateString("pt-PT")
}

const documentTypeLabel = (v?: string | null) => {
  const s = (v ?? "").trim()
  if (!s) return "—"
  if (s === "cartao_cidadao" || s === "CC") return "Cartão de Cidadão"
  if (s === "titulo_residencia") return "Título de Residência"
  if (s === "passaporte") return "Passaporte"
  if (s === "bilhete_identidade") return "Bilhete de Identidade"
  if (s === "outro") return "Outro"
  return s
}

const genderLabel = (v?: string | null) => {
  const s = (v ?? "").trim()
  if (!s) return "—"
  if (s === "M" || s === "male") return "Masculino"
  if (s === "F" || s === "female") return "Feminino"
  if (s === "Other" || s === "other") return "Outro"
  return s
}

const maritalStatusLabel = (v?: string | null) => {
  const s = (v ?? "").trim()
  if (!s) return "—"
  if (s === "single") return "Solteiro(a)"
  if (s === "married") return "Casado(a)"
  if (s === "divorced") return "Divorciado(a)"
  if (s === "widowed") return "Viúvo(a)"
  return s
}

const employmentTypeLabel = (v?: string | null) => {
  const s = (v ?? "").trim()
  if (!s) return "—"
  if (s === "CLT") return "Contrato sem Termo"
  if (s === "PJ") return "Prestação de Serviços"
  if (s === "Intern") return "Estagiário"
  if (s === "Temporary") return "Contrato a Termo"
  if (s === "full_time") return "Tempo inteiro"
  if (s === "part_time") return "Tempo parcial"
  return s
}

const accountTypeLabel = (v?: string | null) => {
  const s = (v ?? "").trim()
  if (!s) return "—"
  if (s === "checking") return "Conta à Ordem"
  if (s === "savings") return "Conta Poupança"
  return s
}

const yesNo = (v?: boolean | null) => (v ? "Sim" : "Não")

export default function EmployeeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [photoIndex, setPhotoIndex] = useState(0)

  useEffect(() => {
    if (!id) {
      navigate("/hr/employees", { replace: true })
      return
    }

    setLoading(true)
    Promise.all([fetchEmployee(id), fetchCompanies(), fetchDepartments()])
      .then(([emp, comps, deps]) => {
        setEmployee(emp.data)
        setCompanies(comps.data)
        setDepartments(deps.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Funcionário não encontrado", variant: "destructive" })
        navigate("/hr/employees", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  const companyName = useMemo(() => {
    if (!employee?.company_id) return "—"
    return companies.find((c) => c.id === employee.company_id)?.name ?? employee.company_id
  }, [companies, employee?.company_id])

  const departmentName = useMemo(() => {
    if (!employee?.department_id) return "—"
    return departments.find((d) => d.id === employee.department_id)?.name ?? employee.department_id
  }, [departments, employee?.department_id])

  useEffect(() => {
    setPhotoIndex(0)
  }, [employee?.name, employee?.photo_path])

  const photoCandidates = useMemo(() => {
    const raw = String(employee?.photo_path ?? "").trim()
    const name = String(employee?.name ?? "User").trim() || "User"
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`

    const encodePath = (path: string) =>
      path
        .split("/")
        .map((seg) => (seg ? encodeURIComponent(seg) : seg))
        .join("/")

    const backendOrigin = window.location.port === "5174" ? "http://127.0.0.1:8000" : window.location.origin

    const list: string[] = []

    if (raw) {
      if (raw.startsWith("data:") || raw.startsWith("http://") || raw.startsWith("https://")) {
        list.push(raw)
      } else {
        const normalized = raw.startsWith("/") ? raw : `/storage/${raw.replace(/^storage\//, "")}`
        list.push(normalized)
      }
    }

    list.push(avatar)

    const encoded = list.map((u) => {
      if (u.startsWith("data:") || u.startsWith("http://") || u.startsWith("https://")) return u
      const [path, query] = u.split("?")
      const next = encodePath(path)
      const rel = query ? `${next}?${query}` : next
      return `${backendOrigin}${rel}`
    })

    return Array.from(new Set(encoded))
  }, [employee?.name, employee?.photo_path])

  const photoSrc = photoCandidates[Math.min(photoIndex, Math.max(0, photoCandidates.length - 1))] ?? ""
  const isDataPhoto = Boolean(photoSrc) && photoSrc.startsWith("data:")

  if (loading || !employee) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Funcionário</h1>
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
            <h1 className="page-title">{employee.name}</h1>
            <p className="page-subtitle">Recursos Humanos → Funcionários</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/hr/employees">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/hr/employees/${employee.id}/edit`}>
                <Pencil />
                Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 space-y-6">
        <div>
          <div className="text-sm font-semibold">Informações Básicas</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Código</div>
              <div className="font-medium">{employee.employee_code ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="mt-1">
                <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border", badgeForStatus(employee.status ?? null))}>
                  {statusLabel(employee.status ?? null)}
                </span>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="text-xs text-muted-foreground">Foto</div>
              <div className="mt-2 flex items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
                <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                  <img
                    src={photoSrc}
                    alt={`Foto ${employee.name}`}
                    className="h-full w-full object-contain"
                    onError={() => {
                      setPhotoIndex((i) => (i + 1 < photoCandidates.length ? i + 1 : i))
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{employee.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {employee.photo_path ? (isDataPhoto ? "Imagem carregada do computador" : photoSrc) : "Avatar gerado"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Email Corporativo</div>
              <div className="font-medium">{employee.email ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Empresa</div>
              <div className="font-medium">{companyName}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Departamento</div>
              <div className="font-medium">{departmentName}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Acesso ao Sistema</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="font-medium">{(employee as any).system_email ?? employee.email ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <div className="font-medium">{yesNo(Boolean((employee as any).has_system_access))}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Password</div>
              <div className="font-medium">••••••••</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Documentos</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">NIF</div>
              <div className="font-medium">{employee.nif ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Tipo de Documento</div>
              <div className="font-medium">{documentTypeLabel(employee.document_type ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Número do Documento</div>
              <div className="font-medium">{employee.document_number ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Validade do Documento</div>
              <div className="font-medium">{fmtDate(employee.document_expiration_date ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">NIS</div>
              <div className="font-medium">{employee.nis ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Data de Nascimento</div>
              <div className="font-medium">{fmtDate(employee.birth_date ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Género</div>
              <div className="font-medium">{genderLabel(employee.gender ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Nacionalidade</div>
              <div className="font-medium">{employee.nationality ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Estado Civil</div>
              <div className="font-medium">{maritalStatusLabel(employee.marital_status ?? null)}</div>
            </div>

            {employee.marital_status === "married" ? (
              <>
                <div className="lg:col-span-3">
                  <div className="text-xs text-muted-foreground">Nome do Cônjuge</div>
                  <div className="font-medium">{employee.spouse_name ?? "—"}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">NIF do Cônjuge</div>
                  <div className="font-medium">{employee.spouse_nif ?? "—"}</div>
                </div>

                <div className="lg:col-span-2">
                  <div className="text-xs text-muted-foreground">IRS em Conjunto?</div>
                  <div className="font-medium">{yesNo(Boolean(employee.spouse_joint_irs))}</div>
                </div>
              </>
            ) : null}

            <div>
              <div className="text-xs text-muted-foreground">Tem Filhos?</div>
              <div className="font-medium">{yesNo(Boolean(employee.has_children))}</div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Filhos</div>
              <div className="font-medium">
                {Array.isArray(employee.children_data) && employee.children_data.length
                  ? employee.children_data
                      .map((c: any) => String(c?.name ?? "").trim())
                      .filter(Boolean)
                      .join(", ")
                  : "—"}
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Deficiente</div>
              <div className="font-medium">{yesNo(Boolean(employee.has_disability))}</div>
              {employee.has_disability ? (
                <div className="mt-1 text-xs text-muted-foreground">Elementos do agregado familiar com grau de deficiência igual ou superior a 60%.</div>
              ) : null}
            </div>

            {employee.has_disability ? (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">Declarante</div>
                  <div className="font-medium">{yesNo(Boolean(employee.disability_declarant))}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Cônjuge</div>
                  <div className="font-medium">{yesNo(Boolean(employee.disability_spouse))}</div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground">Dependentes</div>
                  <div className="font-medium">{employee.disability_dependents ?? "—"}</div>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Contato</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Telefone</div>
              <div className="font-medium">{employee.phone ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Contato de Emergência</div>
              <div className="font-medium">{employee.emergency_contact ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Telefone de Emergência</div>
              <div className="font-medium">{employee.emergency_phone ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Endereço</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">CEP</div>
              <div className="font-medium">{employee.zip_code ?? "—"}</div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Endereço</div>
              <div className="font-medium whitespace-pre-wrap">
                {[
                  employee.address,
                  employee.address_number,
                  employee.complement,
                  employee.neighborhood,
                  employee.city,
                  employee.state,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Dados Profissionais</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Cargo</div>
              <div className="font-medium">{employee.position ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Tipo de Contrato</div>
              <div className="font-medium">{employmentTypeLabel(employee.employment_type ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Data de Admissão</div>
              <div className="font-medium">{fmtDate(employee.hire_date ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Data de Demissão</div>
              <div className="font-medium">{fmtDate(employee.termination_date ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Salário Base</div>
              <div className="font-medium">{employee.salary ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Saldo férias (dias)</div>
              <div className="font-medium">{employee.vacation_days_balance ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Dados Bancários</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Banco</div>
              <div className="font-medium">{employee.bank_name ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Agência</div>
              <div className="font-medium">{employee.bank_agency ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">IBAN</div>
              <div className="font-medium">{employee.bank_account ?? "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Tipo de Conta</div>
              <div className="font-medium">{accountTypeLabel(employee.account_type ?? null)}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Medicina do Trabalho</div>
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Data de Aptidão</div>
              <div className="font-medium">{fmtDate(employee.medical_aptitude_date ?? null)}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Estado</div>
              <div className="font-medium">{employee.medical_status ?? "—"}</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Documentos (dossiê)</div>
          <div className="mt-4 text-sm">
            {Array.isArray(employee.documents) && employee.documents.length
              ? employee.documents
                  .map((d: any) => String(d?.name ?? d?.filename ?? "").trim())
                  .filter(Boolean)
                  .join(", ")
              : "—"}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <div className="text-sm font-semibold">Observações</div>
          <div className="mt-3 text-sm font-medium whitespace-pre-wrap">{employee.notes ?? "—"}</div>
        </div>
      </div>
    </div>
  )
}