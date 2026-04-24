import { useState } from 'react'
import { Sparkles, Loader2, Check, Type, ImageIcon, MousePointerClick, Minus, Space } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'react-hot-toast'
import { generateAiContent, type AiTone } from '@/services/aiApi'
import { v4Fallback } from '@/lib/id'
import type { TemplateBlock, BlockType } from '@/types/template'
import { DEFAULT_BLOCK_PROPS } from '@/types/template'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onApply: (blocks: TemplateBlock[]) => void
}

const TONE_LABELS: { value: AiTone; label: string }[] = [
  { value: 'formal',     label: 'Formal' },
  { value: 'informal',   label: 'Informal' },
  { value: 'persuasivo', label: 'Persuasivo' },
  { value: 'direto',     label: 'Direto' },
  { value: 'amigavel',   label: 'Amigável' },
]

const TEMPLATE_EXAMPLES = [
  'Newsletter mensal com destaques de produtos e promoções',
  'Email de boas-vindas para novos clientes',
  'Campanha de Black Friday com 30% de desconto',
  'Email de recuperação de carrinho abandonado',
  'Convite para evento ou webinar',
  'Confirmação de pedido e agradecimento',
]

const BLOCK_ICON: Partial<Record<BlockType, React.ElementType>> = {
  text: Type,
  image: ImageIcon,
  button: MousePointerClick,
  divider: Minus,
  spacer: Space,
}

function blockLabel(type: BlockType): string {
  const map: Partial<Record<BlockType, string>> = {
    text: 'Texto', image: 'Imagem', button: 'Botão',
    divider: 'Divisor', spacer: 'Espaço', social: 'Redes Sociais',
  }
  return map[type] ?? type
}

function parseBlocks(raw: string): TemplateBlock[] | null {
  // Remove markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  try {
    const parsed = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) return null
    return parsed.map((b: any) => ({
      id: v4Fallback(),
      type: (b.type ?? 'text') as BlockType,
      props: { ...(DEFAULT_BLOCK_PROPS[(b.type as BlockType)] ?? {}), ...(b.props ?? {}) },
    }))
  } catch {
    return null
  }
}

export function AiTemplateDialog({ open, onOpenChange, onApply }: Props) {
  const [tone, setTone] = useState<AiTone>('formal')
  const [prompt, setPrompt] = useState('')
  const [generatedBlocks, setGeneratedBlocks] = useState<TemplateBlock[] | null>(null)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Descreva o template que deseja gerar.')
      return
    }

    setLoading(true)
    setGeneratedBlocks(null)
    try {
      const raw = await generateAiContent({
        action: 'generate_template',
        tone,
        prompt: prompt.trim(),
      })

      const blocks = parseBlocks(raw)
      if (!blocks || blocks.length === 0) {
        toast.error('A IA retornou um formato inválido. Tente novamente.')
        return
      }
      setGeneratedBlocks(blocks)
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao gerar template.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!generatedBlocks) return
    onApply(generatedBlocks)
    onOpenChange(false)
    setGeneratedBlocks(null)
    setPrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Gerar template com IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Tom do email</Label>
            <Select value={tone} onValueChange={v => setTone(v as AiTone)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONE_LABELS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Descreva o template</Label>
            <Textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ex.: Newsletter mensal com destaques de produtos, uma promoção de 20% e botão para a loja..."
              rows={4}
              className="text-sm resize-none"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {TEMPLATE_EXAMPLES.map(ex => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setPrompt(ex)}
                  className="text-xs px-2 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> A gerar template…</>
              : <><Sparkles className="w-4 h-4" /> Gerar template</>
            }
          </Button>

          {generatedBlocks && (
            <div className="space-y-2">
              <Label className="text-xs">
                Template gerado — {generatedBlocks.length} blocos
              </Label>
              <div className="border rounded-md p-3 bg-muted/30 space-y-1.5 max-h-52 overflow-auto">
                {generatedBlocks.map((b, i) => {
                  const Icon = BLOCK_ICON[b.type] ?? Type
                  const preview =
                    b.type === 'text'
                      ? String(b.props.content ?? '').replace(/<[^>]+>/g, '').slice(0, 60)
                      : b.type === 'button'
                      ? String(b.props.text ?? '')
                      : b.type === 'image'
                      ? String(b.props.alt ?? 'Imagem')
                      : ''
                  return (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Icon className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" />
                      <span className="font-medium w-16 shrink-0">{blockLabel(b.type)}</span>
                      {preview && <span className="text-muted-foreground truncate">{preview}</span>}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading}>
                  Regenerar
                </Button>
                <Button size="sm" className="gap-1.5" onClick={handleApply}>
                  <Check className="w-4 h-4" />
                  Aplicar ao editor
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
