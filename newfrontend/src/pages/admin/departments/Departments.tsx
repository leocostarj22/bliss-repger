import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Eye, Pencil, Plus, Search, Trash2, Layers } from "lucide-react"

import type { Company, Department } from "@/types"
import { deleteDepartment, fetchCompanies, fetchDepartments } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function Departments() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Department[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Department | null>(null)

  const companyNameById = useMemo(() => {
    const map: Record<string, string> = {}
    companies.forEach((c) => (map[c.id] = c.name))
    return map
  }, [companies])

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true)
      Promise.all([
        fetchDepartments({
          search,
          company_id: companyFilter === "all" ? undefined : companyFilter,
        }),
        fetchCompanies(),
      ])
        .then(([deps, comps]) => {
          setRows(deps.data)
          setCompanies(comps.data)
        })
        .finally(() => setLoading(false))
    }, 250)

    return () => clearTimeout(t)
  }, [search, companyFilter])

  const requestDelete = (d: Department) => {
    setPendingDelete(d)
    setDeleteOpen(true)
  }

  const confirmDelete = async () => {
    const d = pendingDelete
    setDeleteOpen(false)
    setPendingDelete(null)
    if (!d) return

    try {
      await deleteDepartment(d.id)
      setRows((prev) => prev.filter((x) => x.id !== d.id))
      toast({ title: "Sucesso", description: "Departamento eliminado" })
    } catch {
      toast({ title: "Erro", description: "Falha ao eliminar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Departamentos</h1>
            <p className="page-subtitle">Administração → Departamentos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/admin/departments/new">
              <Plus />
              Novo departamento
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
              placeholder="Pesquisar por nome, slug, email…"
              className="max-w-lg"
            />
          </div>

          <div className="w-full lg:w-[280px]">
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por empresa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as empresas</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Departamento</th>
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Cor</th>
                <th className="py-3 pr-4">Ativo</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-52" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-44" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-14" />
                    </td>
                    <td className="py-4 text-right">
                      <Skeleton className="h-9 w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum departamento encontrado
                  </td>
                </tr>
              ) : (
                rows.map((d) => (
                  <tr key={d.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{d.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{d.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{companyNameById[d.company_id] ?? d.company_id}</td>
                    <td className="py-4 pr-4">{d.email ?? "—"}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex h-4 w-4 rounded-full border border-border"
                          style={{ backgroundColor: d.color ?? "#94a3b8" }}
                          title={d.color ?? undefined}
                        />
                        <span className="text-xs text-muted-foreground">{d.color ?? "—"}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                          d.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {d.is_active ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/departments/${d.id}`}>
                            <Eye />
                            Ver
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/departments/${d.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => requestDelete(d)}>
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
              <div className="text-lg font-semibold">Eliminar departamento?</div>
              <div className="text-sm text-muted-foreground">
                {pendingDelete ? `Deseja eliminar “${pendingDelete.name}”?` : "Deseja eliminar este departamento?"}
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