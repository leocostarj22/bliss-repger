import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { BadgeCheck, Eye, Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Role } from "@/types"
import { deleteRole, fetchRoles } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

export default function Roles() {
  const { toast } = useToast()

  const [rows, setRows] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null)

  const activeParam = useMemo(() => {
    if (activeFilter === "all") return undefined
    return activeFilter === "active"
  }, [activeFilter])

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      fetchRoles({ search, is_active: activeParam })
        .then((r) => setRows(r.data))
        .finally(() => setLoading(false))
    }, 250)

    return () => clearTimeout(t)
  }, [search, activeParam])

  const requestDelete = (r: Role) => {
    setPendingDelete(r)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const r = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!r) return

    try {
      await deleteRole(r.id)
      setRows((prev) => prev.filter((x) => x.id !== r.id))
      toast({ title: "Sucesso", description: "Cargo eliminado" })
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Cargos</h1>
            <p className="page-subtitle">Administração → Cargos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/admin/roles/new">
              <Plus />
              Novo cargo
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-4">
          <div className="flex items-center gap-2 flex-1">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por nome, display name, descrição, permissões…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[180px]">
            <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Cargo</th>
                <th className="py-3 pr-4">Permissões</th>
                <th className="py-3 pr-4">Ativo</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <BadgeCheck className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-56" />
                      </div>
                      <div className="mt-2">
                        <Skeleton className="h-3 w-72" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-48" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    Nenhum cargo encontrado
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.display_name ?? r.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.name}</div>
                        {r.description ? (
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-1">{r.description}</div>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-xs text-muted-foreground">
                        {(r.permissions ?? []).length ? (r.permissions ?? []).join(", ") : "—"}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={[
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                          r.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border",
                        ].join(" ")}
                      >
                        {r.is_active ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/roles/${r.id}`}>
                            <Eye />
                            Ver
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/roles/${r.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(r)}>
                          <Trash2 />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false)
            setPendingDelete(null)
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar cargo?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete
                  ? `Deseja eliminar “${pendingDelete.display_name ?? pendingDelete.name}”?`
                  : "Deseja eliminar este cargo?"}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false)
                  setPendingDelete(null)
                }}
              >
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={confirmDelete}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}