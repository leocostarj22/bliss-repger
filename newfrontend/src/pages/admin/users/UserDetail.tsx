import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"

import type { Company, Department, User } from "@/types"
import { fetchAdminUser, fetchCompanies, fetchDepartments } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function UserDetail() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [departments, setDepartments] = useState<Department[]>([])

  const companyName = useMemo(() => {
    if (!user?.company_id) return "—"
    return companies.find((c) => c.id === user.company_id)?.name ?? user.company_id
  }, [companies, user])

  const companyNames = useMemo(() => {
    const ids = Array.isArray(user?.company_ids)
      ? user!.company_ids!.filter(Boolean)
      : user?.company_id
        ? [user.company_id]
        : []

    const uniq = Array.from(new Set(ids))
    return uniq.map((id) => companies.find((c) => c.id === id)?.name ?? id)
  }, [companies, user])

  const departmentName = useMemo(() => {
    if (!user?.department_id) return "—"
    return departments.find((d) => d.id === user.department_id)?.name ?? user.department_id
  }, [departments, user])

  useEffect(() => {
    if (!id) return
    setLoading(true)

    Promise.all([fetchAdminUser(id), fetchCompanies(), fetchDepartments()])
      .then(([uResp, cResp, dResp]) => {
        setUser(uResp.data)
        setCompanies(cResp.data)
        setDepartments(dResp.data)
      })
      .catch(() => {
        toast({ title: "Erro", description: "Utilizador não encontrado", variant: "destructive" })
        navigate("/admin/users", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  if (loading || !user) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Utilizador</h1>
          <p className="page-subtitle">Administração → Utilizadores</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  const photoSrc = user.photo_path ?? ""
  const isDataPhoto = Boolean(photoSrc) && photoSrc.startsWith("data:")

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{user.name}</h1>
            <p className="page-subtitle">Administração → Utilizadores</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/users">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/users/${user.id}/edit`}>
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
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-medium">{user.email}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Role</div>
            <div className="font-medium">{user.role ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Empresa principal</div>
            <div className="font-medium">{companyName}</div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Empresas (acesso)</div>
            <div className="font-medium">{companyNames.length ? companyNames.join(", ") : "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Departamento</div>
            <div className="font-medium">{departmentName}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Telefone</div>
            <div className="font-medium">{user.phone ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ativo</div>
            <div className="mt-1">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                  user.is_active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border",
                ].join(" ")}
              >
                {user.is_active ? "Sim" : "Não"}
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Bio</div>
            <div className="font-medium whitespace-pre-wrap">{user.bio ?? "—"}</div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Foto</div>

            {!photoSrc ? (
              <div className="font-medium">—</div>
            ) : (
              <div className="mt-2 flex items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
                <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                  <img src={photoSrc} alt={`Foto ${user.name}`} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{user.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isDataPhoto ? "Imagem carregada do computador" : photoSrc}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Último login</div>
            <div className="font-medium">{user.last_login_at ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  )
}