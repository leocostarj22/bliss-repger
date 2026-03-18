import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, Pencil } from "lucide-react"

import type { Role } from "@/types"
import { fetchRole } from "@/services/api"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"

export default function RoleDetail() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { id } = useParams()

  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<Role | null>(null)

  const permissions = useMemo(() => role?.permissions ?? [], [role])

  useEffect(() => {
    if (!id) return
    setLoading(true)

    fetchRole(id)
      .then((r) => setRole(r.data))
      .catch(() => {
        toast({ title: "Erro", description: "Cargo não encontrado", variant: "destructive" })
        navigate("/admin/roles", { replace: true })
      })
      .finally(() => setLoading(false))
  }, [id, navigate, toast])

  if (loading || !role) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Cargo</h1>
          <p className="page-subtitle">Administração → Cargos</p>
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
            <h1 className="page-title">{role.display_name ?? role.name}</h1>
            <p className="page-subtitle">Administração → Cargos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/roles">
                <ArrowLeft />
                Voltar
              </Link>
            </Button>
            <Button asChild>
              <Link to={`/admin/roles/${role.id}/edit`}>
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
            <div className="text-xs text-muted-foreground">Nome (interno)</div>
            <div className="font-medium">{role.name}</div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground">Ativo</div>
            <div className="mt-1">
              <span
                className={[
                  "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                  role.is_active
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-muted text-muted-foreground border-border",
                ].join(" ")}
              >
                {role.is_active ? "Sim" : "Não"}
              </span>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Descrição</div>
            <div className="font-medium whitespace-pre-wrap">{role.description ?? "—"}</div>
          </div>

          <div className="lg:col-span-2">
            <div className="text-xs text-muted-foreground">Permissões</div>

            {permissions.length === 0 ? (
              <div className="font-medium">—</div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {permissions.map((p) => (
                  <span key={p} className="inline-flex items-center rounded-full border border-border bg-background/40 px-2 py-1 text-xs">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}