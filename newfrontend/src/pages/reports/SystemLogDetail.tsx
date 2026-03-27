import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { fetchSystemLog } from "@/services/api"
import type { SystemLog } from "@/types"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const levelBadge = (level: string) => {
  const l = (level || "").toLowerCase()
  if (l === "error" || l === "critical") return "bg-rose-500/10 text-rose-400 border-rose-500/20"
  if (l === "warning") return "bg-amber-500/10 text-amber-400 border-amber-500/20"
  if (l === "info") return "bg-sky-500/10 text-sky-400 border-sky-500/20"
  if (l === "debug") return "bg-muted text-muted-foreground border-border"
  return "bg-muted text-muted-foreground border-border"
}

const classBasename = (value?: string | null) => {
  const raw = String(value ?? "").trim()
  if (!raw) return ""
  const parts = raw.split("\\")
  return parts[parts.length - 1] ?? raw
}

const modelTypeLabel = (modelType?: string | null) => {
  const base = classBasename(modelType)
  const key = base.toLowerCase()
  if (key === "personalnote") return "Anotação"
  if (key === "task") return "Tarefa"
  if (key === "user") return "Utilizador"
  if (key === "ticket") return "Ticket"
  if (key === "post") return "Publicação"
  return base || "Sistema"
}

const getModelPrimaryLabel = (row: SystemLog) => {
  const data = (row as any)?.context?.model_data
  const title = typeof data?.title === "string" ? data.title.trim() : ""
  const name = typeof data?.name === "string" ? data.name.trim() : ""
  const email = typeof data?.email === "string" ? data.email.trim() : ""
  return title || name || email
}

const describeAction = (row: SystemLog) => {
  const action = String(row.action ?? "").trim().toLowerCase()
  const typeLabel = modelTypeLabel(row.model_type)
  const primary = getModelPrimaryLabel(row)
  const id = String(row.model_id ?? "").trim()
  if (action === "login") return "Iniciou sessão"
  if (action === "logout") return "Terminou sessão"
  const suffix = primary ? `: ${primary}` : id ? ` #${id}` : ""
  if (action === "create") return `Criou ${typeLabel.toLowerCase()}${suffix}`
  if (action === "update") return `Atualizou ${typeLabel.toLowerCase()}${suffix}`
  if (action === "delete") return `Eliminou ${typeLabel.toLowerCase()}${suffix}`
  return suffix ? `${row.action}${suffix}` : row.action
}

const normalizeDescription = (row: SystemLog) => {
  const raw = String(row.description ?? "").trim()
  if (!raw) return ""
  if (/^Registro\s+(criado|atualizado|exclu[ií]do)$/i.test(raw)) return ""
  return raw
}

const resourceLabel = (row: SystemLog) => {
  const typeLabel = modelTypeLabel(row.model_type)
  const primary = getModelPrimaryLabel(row)
  const id = String(row.model_id ?? "").trim()
  if (typeLabel === "Sistema" && !primary && !id) return "Sistema"
  if (primary) return `${typeLabel}: ${primary}`
  if (id) return `${typeLabel} #${id}`
  return typeLabel
}

export default function SystemLogDetail() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [row, setRow] = useState<SystemLog | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const resp = await fetchSystemLog(String(id))
        if (alive) setRow(resp.data)
      } catch {
        toast({ title: "Erro", description: "Falha ao carregar detalhe do log", variant: "destructive" })
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id, toast])

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Detalhe do Log</h1>
            <p className="page-subtitle">Relatórios e Logs → Logs do Sistema</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/reports/system-logs")}>
              <ArrowLeft />
              Voltar
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading || !row ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-full lg:col-span-2" />
            <Skeleton className="h-5 w-full lg:col-span-2" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-5 w-56" />
            <Skeleton className="h-32 w-full lg:col-span-2" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">Data</div>
              <div className="font-medium">{new Date(row.created_at).toLocaleString("pt-PT")}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Nível</div>
              <div className="mt-1">
                <span className={cn("inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border", levelBadge(row.level))}>
                  {row.level}
                </span>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Ação</div>
              <div className="font-medium">{describeAction(row)}</div>
              <div className="text-xs text-muted-foreground">{row.action}</div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Descrição</div>
              <div className="font-medium whitespace-pre-wrap">{normalizeDescription(row) || "—"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Utilizador</div>
              <div className="font-medium">{row.user_id ?? "Sistema"}</div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">IP</div>
              <div className="font-medium">{row.ip_address ?? "—"}</div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Recurso</div>
              <div className="font-medium">{resourceLabel(row)}</div>
              <div className="text-xs text-muted-foreground">{row.model_id ?? "—"}</div>
            </div>

            <div className="lg:col-span-2">
              <div className="text-xs text-muted-foreground">Context</div>
              <pre className="mt-1 rounded-md border border-border bg-background/40 p-3 text-xs overflow-auto">
                {JSON.stringify(row.context ?? {}, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}