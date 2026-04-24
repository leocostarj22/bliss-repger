import { useState } from 'react'
import { Sparkles, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import { generateAiContent, type AiAction, type AiTone } from '@/services/aiApi'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentContent: string
  onApply: (html: string) => void
}

const ACTION_LABELS: { value: AiAction; label: string; needsPrompt: boolean }[] = [
  { value: 'generate_text', label: 'Gerar novo texto', needsPrompt: true },
  { value: 'improve_text',  label: 'Melhorar texto atual', needsPrompt: false },
  { value: 'rewrite',       label: 'Reescrever completamente', needsPrompt: false },
  { value: 'summarize',     label: 'Resumir texto atual', needsPrompt: false },
]

const TONE_LABELS: { value: AiTone; label: string }[] = [
  { value: 'formal',     label: 'Formal' },
  { value: 'informal',   label: 'Informal' },
  { value: 'persuasivo', label: 'Persuasivo' },
  { value: 'direto',     label: 'Direto' },
  { value: 'amigavel',   label: 'Amigável' },
]

export function AiTextDialog({ open, onOpenChange, currentContent, onApply }: Props) {
  const [action, setAction] = useState<AiAction>('generate_text')
  const [tone, setTone] = useState<AiTone>('formal')
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedAction = ACTION_LABELS.find(a => a.value === action)!

  const handleGenerate = async () => {
    const needsPrompt = selectedAction.needsPrompt
    if (needsPrompt && !prompt.trim()) {
      toast.error('Descreva o que deseja gerar.')
      return
    }

    setLoading(true)
    setResult('')
    try {
      const content = await generateAiContent({
        action,
        tone,
        prompt: prompt.trim() || undefined,
        current_content: currentContent || undefined,
      })
      setResult(content)
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao gerar conteúdo.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!result) return
    onApply(result)
    onOpenChange(false)
    setResult('')
    setPrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Escrever com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Ação</Label>
              <Select value={action} onValueChange={v => { setAction(v as AiAction); setResult('') }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_LABELS.map(a => (
                    <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Tom</Label>
              <Select value={tone} onValueChange={v => setTone(v as AiTone)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_LABELS.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedAction.needsPrompt && (
            <div className="space-y-1.5">
              <Label className="text-xs">Descreva o texto que deseja gerar</Label>
              <Textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ex.: Email de boas-vindas para novos clientes que se inscreveram na newsletter..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          )}

          {!selectedAction.needsPrompt && currentContent && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Texto atual (será usado como base)</Label>
              <div
                className="text-xs border rounded-md p-2.5 bg-muted/40 max-h-24 overflow-auto text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: currentContent }}
              />
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full gap-2"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> A gerar…</>
              : <><Sparkles className="w-4 h-4" /> Gerar</>
            }
          </Button>

          {result && (
            <div className="space-y-2">
              <Label className="text-xs">Resultado</Label>
              <div
                className="text-sm border rounded-md p-3 bg-muted/30 max-h-48 overflow-auto"
                dangerouslySetInnerHTML={{ __html: result }}
              />
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  Regenerar
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleApply}>
                  <Check className="w-4 h-4" />
                  Aplicar ao bloco
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
