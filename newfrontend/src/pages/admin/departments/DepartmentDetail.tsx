import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"

import type { Company, Department } from "@/types"
import { fetchCompanies, fetchDepartment } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function DepartmentDetail() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [department, setDepartment] = useState<Department | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])

  const companyName = useMemo(() => {
    if (!department) return ""
    return companies.find((c) => c.id === department.company_id)?.name ?? department.company_id
  }, [companies, department])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([fetchDepartment(id), fetchCompanies()])
      .then(([dep, comps]) => {
        setDepartment(dep.data)
        setCompanies(comps.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Departamento não encontrado", variant: "destructive" })
        navigate("/admin/departments", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  if (loading || !department) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Departamento</h1>
          <p className="page-subtitle">Administração → Departamentos</p>
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
            <h1 className="page-title">{department.name}</h1>
            <p className="page-subtitle">Administração → Departamentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/departments">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/departments/${department.id}/edit`}>
                <Pencil />
                Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Empresa</div>
            <div className="font-medium">{companyName}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Slug</div>
            <div className="font-medium">{department.slug}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-medium">{department.email ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Cor</div>
            <div className="mt-1 flex items-center gap-2">
              <span
                className="inline-flex h-4 w-4 rounded-full border border-border"
                style={{ backgroundColor: department.color ?? "#94a3b8" }}
              />
              <span className="font-medium">{department.color ?? "—"}</span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Descrição</div>
            <div className="font-medium whitespace-pre-wrap">{department.description ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ativo</div>
            <div
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border mt-1",
                department.is_active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {department.is_active ? "Sim" : "Não"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Company ID</div>
            <div className="font-medium">{department.company_id}</div>
          </div>
        </div>
      </div>
    </div>
  )
}