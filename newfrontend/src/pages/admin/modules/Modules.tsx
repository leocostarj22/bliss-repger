import { useEffect, useMemo, useState } from "react"
import { Save, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { fetchAdminModules, fetchUser, updateAdminModules, type AdminModule } from "@/services/api"

export default function Modules() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [rows, setRows] = useState<AdminModule[]>([])

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      try {
        const me = await fetchUser()
        const role = String(me.data.role ?? "").toLowerCase()
        const admin = Boolean(me.data.is_admin) || role === "admin"

        if (!active) return
        setIsAdmin(admin)

        if (!admin) return

        const r = await fetchAdminModules()
        if (!active) return
        setRows(r.data)
      } catch (e: any) {
        if (!active) return
        const msg = String(e?.message ?? "")
        if (msg.includes("403")) {
          setIsAdmin(false)
        } else {
          toast({ title: "Erro", description: "Falha ao carregar módulos", variant: "destructive" })
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    run()
    return () => {
      active = false
    }
  }, [toast])

  const hasRows = useMemo(() => rows.length > 0, [rows])

  const handleToggle = (key: string, enabled: boolean) => {
    setRows((prev) => prev.map((m) => (m.key === key ? { ...m, enabled } : m)))
  }

  const handleSave = async () => {
    if (!isAdmin || !hasRows) return
    setSaving(true)
    try {
      const r = await updateAdminModules(rows)
      setRows(r.data)
      toast({
        title: "Sucesso",
        description: "Configuração de módulos atualizada. Recarregue o painel para refletir no menu.",
      })
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar módulos", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="page-header">
          <h1 className="page-title">Módulos</h1>
          <p className="page-subtitle">Administração → Módulos</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6">
          <div className="text-sm text-muted-foreground">A carregar…</div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6 animate-slide-up">
        <div className="page-header">
          <h1 className="page-title">Módulos</h1>
          <p className="page-subtitle">Administração → Módulos</p>
          <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
        </div>
        <div className="glass-card p-6 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <div className="font-semibold">Acesso restrito</div>
            <div className="text-sm text-muted-foreground">Apenas administradores podem alterar os módulos do painel.</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Módulos</h1>
            <p className="page-subtitle">Administração → Módulos</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>

          <Button onClick={handleSave} disabled={saving || !hasRows}>
            <Save />
            {saving ? "A guardar..." : "Guardar alterações"}
          </Button>
        </div>
      </div>

      <div className="glass-card p-6 space-y-4">
        {!hasRows ? (
          <div className="text-sm text-muted-foreground">Nenhum módulo encontrado.</div>
        ) : (
          rows.map((m) => (
            <div key={m.key} className="flex items-center justify-between rounded-lg border border-border bg-background/30 px-4 py-3">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">Chave: {m.key}</div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={[
                    "inline-flex items-center rounded-full px-2 py-1 text-xs font-medium border",
                    m.enabled
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-muted text-muted-foreground border-border",
                  ].join(" ")}
                >
                  {m.enabled ? "Ativo" : "Inativo"}
                </span>
                <Switch checked={m.enabled} onCheckedChange={(checked) => handleToggle(m.key, checked)} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}