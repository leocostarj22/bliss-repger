import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Building2, Eye, Loader2, Pencil, Plus, Search, Trash2 } from "lucide-react"

import type { Company } from "@/types"
import { fetchCompanies, deleteCompany } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function Companies() {
  const { toast } = useToast()
  const [rows, setRows] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [search, setSearch] = useState("")

  const requestSeq = useRef(0)
  const hasLoadedOnce = useRef(false)

  useEffect(() => {
    const seq = ++requestSeq.current
    const isInitial = !hasLoadedOnce.current

    if (isInitial) {
      setLoading(true)
    } else {
      setRefreshing(true)
    }

    const t = setTimeout(() => {
      fetchCompanies({ search })
        .then((r) => {
          if (seq !== requestSeq.current) return
          setRows(r.data)
          hasLoadedOnce.current = true
        })
        .catch((e: any) => {
          if (seq !== requestSeq.current) return
          toast({
            title: "Erro",
            description:
              typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao carregar empresas",
            variant: "destructive",
          })
        })
        .finally(() => {
          if (seq !== requestSeq.current) return
          setLoading(false)
          setRefreshing(false)
        })
    }, 250)

    return () => clearTimeout(t)
  }, [search, toast])

  const handleDelete = async (id: string) => {
    if (!confirm("Tem a certeza que deseja eliminar esta empresa?")) return
    try {
      await deleteCompany(id)
      setRows((prev) => prev.filter((c) => c.id !== id))
      toast({ title: "Sucesso", description: "Empresa eliminada" })
    } catch (e: any) {
      toast({
        title: "Erro",
        description: typeof e?.message === "string" && e.message.trim() ? e.message : "Falha ao eliminar",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Empresas</h1>
            <p className="page-subtitle">Administração → Empresas</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button asChild>
            <Link to="/admin/companies/new">
              <Plus />
              Nova empresa
            </Link>
          </Button>
        </div>
      </div>

      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          {refreshing ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome, slug, email, telefone…"
            className="max-w-lg"
          />
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-3 pr-4">Empresa</th>
                <th className="py-3 pr-4">Email</th>
                <th className="py-3 pr-4">Telefone</th>
                <th className="py-3 pr-4">Ativa</th>
                <th className="py-3 text-right">Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/60">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-40" />
                    </td>
                    <td className="py-4 pr-4">
                      <Skeleton className="h-4 w-28" />
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
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhuma empresa encontrada
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-secondary/30 transition-colors">
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div className="min-w-0">
                          <div className="font-semibold truncate">{c.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{c.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">{c.email ?? "—"}</td>
                    <td className="py-4 pr-4">{c.phone ?? "—"}</td>
                    <td className="py-4 pr-4">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                          c.is_active
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {c.is_active ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/companies/${c.id}`}>
                            <Eye />
                            Ver
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/admin/companies/${c.id}/edit`}>
                            <Pencil />
                            Editar
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleDelete(c.id)}>
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
    </div>
  )
}