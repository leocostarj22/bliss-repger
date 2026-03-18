import { useEffect, useState } from "react"
import { Copy, ExternalLink, Plus, Video } from "lucide-react"

import type { VideoCallMeeting } from "@/types"
import { createVideoCallMeeting, fetchVideoCallMeetings } from "@/services/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"

const fmtDateTime = (iso?: string | null) => {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("pt-PT")
  } catch {
    return String(iso)
  }
}

export default function VideoCall() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<VideoCallMeeting[]>([])
  const [title, setTitle] = useState("")
  const [scheduledAt, setScheduledAt] = useState<string>("")

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchVideoCallMeetings()
      setRows(resp.data)
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar reuniões", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const onCreate = async () => {
    const t = title.trim()
    if (!t) {
      toast({ title: "Validação", description: "Define um título para a reunião", variant: "destructive" })
      return
    }

    try {
      const scheduled_at = scheduledAt ? new Date(scheduledAt).toISOString() : null
      const resp = await createVideoCallMeeting({ title: t, scheduled_at })
      setRows((prev) => [resp.data, ...prev])
      setTitle("")
      setScheduledAt("")
      toast({ title: "Sucesso", description: "Link de reunião criado" })
      window.open(resp.data.meet_url, "_blank", "noopener,noreferrer")
    } catch {
      toast({ title: "Erro", description: "Não foi possível criar a reunião", variant: "destructive" })
    }
  }

  const onCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast({ title: "Copiado", description: "Link copiado para a área de transferência" })
    } catch {
      toast({ title: "Erro", description: "Não foi possível copiar", variant: "destructive" })
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <h1 className="page-title">Video Call</h1>
        <p className="page-subtitle">Criação e gestão de links de reunião</p>
        <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
      </div>

      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Video className="w-4 h-4 text-fuchsia-400" />
          Nova reunião
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
          <Input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            placeholder="Agendamento"
          />
          <div className="flex gap-2">
            <Button onClick={onCreate} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Criar
            </Button>
            <Button variant="outline" onClick={() => window.open("/admin/video-call", "_blank", "noopener,noreferrer")}>
              Abrir GMCentral
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">As reuniões são criadas no GMCentral e abertas via Jitsi.</div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-sm font-semibold">Reuniões</div>
            <div className="text-xs text-muted-foreground">Histórico</div>
          </div>
          <Button variant="outline" onClick={load} disabled={loading}>
            Atualizar
          </Button>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">A carregar…</div>
        ) : rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">Sem reuniões.</div>
        ) : (
          <div className="space-y-3">
            {rows.map((m) => (
              <div key={m.id} className="rounded-lg border border-border/60 bg-background/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">{m.title}</div>
                    <div className="text-xs text-muted-foreground">Agendada: {fmtDateTime(m.scheduled_at)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => onCopy(m.meet_url)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => window.open(m.meet_url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Entrar
                    </Button>
                  </div>
                </div>

                <div className="mt-2 text-xs text-muted-foreground break-all">{m.meet_url}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}