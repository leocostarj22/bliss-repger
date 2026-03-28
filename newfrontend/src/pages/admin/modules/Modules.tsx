import { useEffect, useMemo, useState } from "react"
import { Save, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { fetchAdminModules, fetchMyAccess, updateAdminModules, type AdminModule } from "@/services/api"
import { hasEffectivePermission } from "@/lib/utils"

export default function Modules() {
  const { toast } = useToast()

  const syncModuleCache = (modules: AdminModule[]) => {
    if (typeof window === "undefined") return
    const map = modules.reduce<Record<string, boolean>>((acc, item) => {
      acc[item.key] = Boolean(item.enabled)
      return acc
    }, {})
    window.localStorage.setItem("nexterp:module-statuses", JSON.stringify(map))
    window.dispatchEvent(new Event("nexterp:modules:updated"))
  }

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [rows, setRows] = useState<AdminModule[]>([])

  useEffect(() => {
    let active = true

    const run = async () => {
      setLoading(true)
      try {
        const me = await fetchMyAccess()
        const allowed =
          Boolean(me.data.isAdmin) ||
          hasEffectivePermission(me.data.permissions, me.data.permissionsDeny, "admin.modules.manage")

        if (!active) return
        setIsAdmin(allowed)

        if (!allowed) return

        const r = await fetchAdminModules()
        if (!active) return
        setRows(r.data)
        syncModuleCache(r.data)
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
      syncModuleCache(r.data)
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
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="p-6 glass-card">
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
          <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
        </div>
        <div className="flex gap-3 items-start p-6 glass-card">
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
        <div className="flex gap-4 justify-between items-start">
          <div>
            <h1 className="page-title">Módulos</h1>
            <p className="page-subtitle">Administração → Módulos</p>
            <div className="mt-3 w-24 h-1 bg-gradient-to-r from-cyan-400 to-fuchsia-500 rounded-full" />
          </div>

          <Button onClick={handleSave} disabled={saving || !hasRows}>
            <Save />
            {saving ? "A guardar..." : "Guardar alterações"}
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-4 glass-card">
        {!hasRows ? (
          <div className="text-sm text-muted-foreground">Nenhum módulo encontrado.</div>
        ) : (
          rows.map((m) => (
            <div key={m.key} className="flex justify-between items-center px-4 py-3 rounded-lg border border-border bg-background/30">
              <div>
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">Chave: {m.key}</div>
              </div>

              <div className="flex gap-3 items-center">
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