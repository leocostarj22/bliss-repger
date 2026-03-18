import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"

import type { Company } from "@/types"
import { fetchCompany } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function CompanyDetail() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<Company | null>(null)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchCompany(id)
      .then((r) => setCompany(r.data))
      .catch(() => {
        toast({ title: "Erro", description: "Empresa não encontrada", variant: "destructive" })
        navigate("/admin/companies", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  if (loading || !company) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Empresa</h1>
          <p className="page-subtitle">Administração → Empresas</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  const logoSrc = company.logo ?? ""
  const logoFileName = typeof (company.settings as any)?.logoFileName === "string" ? (company.settings as any).logoFileName : ""
  const isDataLogo = Boolean(logoSrc) && logoSrc.startsWith("data:")

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{company.name}</h1>
            <p className="page-subtitle">Administração → Empresas</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/companies">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/companies/${company.id}/edit`}>
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
            <div className="text-xs text-muted-foreground">Slug</div>
            <div className="font-medium">{company.slug}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ativa</div>
            <div
              className={cn(
                "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border mt-1",
                company.is_active
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-muted text-muted-foreground border-border"
              )}
            >
              {company.is_active ? "Sim" : "Não"}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Email</div>
            <div className="font-medium">{company.email ?? "—"}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Telefone</div>
            <div className="font-medium">{company.phone ?? "—"}</div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Morada</div>
            <div className="font-medium whitespace-pre-wrap">{company.address ?? "—"}</div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Logo</div>

            {!logoSrc ? (
              <div className="font-medium">—</div>
            ) : (
              <div className="mt-2 flex items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
                <div className="h-14 w-14 rounded-md border border-border bg-background overflow-hidden flex items-center justify-center">
                  <img src={logoSrc} alt={`Logo ${company.name}`} className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{company.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {isDataLogo ? (logoFileName.trim() ? logoFileName : "Imagem carregada do computador") : logoSrc}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Settings</div>
            <pre className="mt-2 rounded-md border border-border bg-background/40 p-3 overflow-auto text-xs">
              {JSON.stringify(company.settings ?? {}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}