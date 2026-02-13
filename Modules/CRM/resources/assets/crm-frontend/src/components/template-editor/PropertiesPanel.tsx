import { useRef } from 'react';
import type { TemplateBlock } from '@/types/template';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ImagePlus } from 'lucide-react';
import { handleImageUpload } from '@/lib/tiptap-utils';
import { toast } from 'react-hot-toast';


interface Props {
  block: TemplateBlock;
  onChange: (props: Record<string, unknown>) => void;
}

export function PropertiesPanel({ block, onChange }: Props) {
  const p = block.props;
  const set = (key: string, val: unknown) => onChange({ ...p, [key]: val });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Enviando imagem...");

    try {
      const url = await handleImageUpload(file);
      set('src', url);
      toast.success("Imagem enviada com sucesso", { id: toastId });
    } catch (error) {
      console.error("Erro ao enviar imagem:", error);
      toast.error("Erro ao enviar imagem", { id: toastId });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="w-64 shrink-0 border-l border-border bg-card p-4 space-y-5 overflow-y-auto">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Propriedades — {block.type}
      </h3>

      {block.type === 'text' && (
        <>
          <Field label="Conteúdo">
            <Textarea value={String(p.content)} onChange={e => set('content', e.target.value)} rows={4} className="text-sm" />
          </Field>
          <Field label="Tamanho da fonte">
            <div className="flex items-center gap-3">
              <Slider value={[Number(p.fontSize)]} onValueChange={([v]) => set('fontSize', v)} min={10} max={48} step={1} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{String(p.fontSize)}px</span>
            </div>
          </Field>
          <Field label="Cor do texto">
            <Input type="color" value={String(p.color)} onChange={e => set('color', e.target.value)} className="h-9 w-full" />
          </Field>
          <Field label="Alinhamento">
            <AlignSelect value={String(p.align)} onChange={v => set('align', v)} />
          </Field>
        </>
      )}

      {block.type === 'image' && (
        <>
          <Field label="URL da imagem">
            <div className="flex gap-2">
              <Input value={String(p.src)} onChange={e => set('src', e.target.value)} className="text-sm" />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                title="Carregar do PC"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
            </div>
          </Field>
          <Field label="Texto alternativo">
            <Input value={String(p.alt)} onChange={e => set('alt', e.target.value)} className="text-sm" />
          </Field>
          <Field label="Largura">
            <Input value={String(p.width)} onChange={e => set('width', e.target.value)} className="text-sm" placeholder="100% ou 300px" />
          </Field>
        </>
      )}

      {block.type === 'button' && (
        <>
          <Field label="Texto do botão">
            <Input value={String(p.text)} onChange={e => set('text', e.target.value)} className="text-sm" />
          </Field>
          <Field label="URL">
            <Input value={String(p.url)} onChange={e => set('url', e.target.value)} className="text-sm" />
          </Field>
          <Field label="Cor de fundo">
            <Input type="color" value={String(p.bgColor)} onChange={e => set('bgColor', e.target.value)} className="h-9 w-full" />
          </Field>
          <Field label="Cor do texto">
            <Input type="color" value={String(p.textColor)} onChange={e => set('textColor', e.target.value)} className="h-9 w-full" />
          </Field>
          <Field label="Alinhamento">
            <AlignSelect value={String(p.align)} onChange={v => set('align', v)} />
          </Field>
          <Field label="Borda arredondada">
            <div className="flex items-center gap-3">
              <Slider value={[Number(p.borderRadius)]} onValueChange={([v]) => set('borderRadius', v)} min={0} max={32} step={1} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{String(p.borderRadius)}px</span>
            </div>
          </Field>
        </>
      )}

      {block.type === 'divider' && (
        <>
          <Field label="Espessura">
            <Slider value={[Number(p.height)]} onValueChange={([v]) => set('height', v)} min={1} max={8} step={1} />
          </Field>
          <Field label="Cor">
            <Input type="color" value={String(p.color)} onChange={e => set('color', e.target.value)} className="h-9 w-full" />
          </Field>
          <Field label="Margem">
            <Slider value={[Number(p.margin)]} onValueChange={([v]) => set('margin', v)} min={0} max={48} step={4} />
          </Field>
        </>
      )}

      {block.type === 'columns' && (
        <>
          <Field label="Número de colunas">
            <Select value={String(p.columns)} onValueChange={v => set('columns', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 Colunas</SelectItem>
                <SelectItem value="3">3 Colunas</SelectItem>
                <SelectItem value="4">4 Colunas</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Espaçamento">
            <Slider value={[Number(p.gap)]} onValueChange={([v]) => set('gap', v)} min={0} max={32} step={4} />
          </Field>
        </>
      )}

      {block.type === 'html' && (
        <Field label="Código HTML">
          <Textarea value={String(p.code)} onChange={e => set('code', e.target.value)} rows={8} className="font-mono text-xs" />
        </Field>
      )}
      {block.type === 'video' && (
        <>
          <Field label="URL do vídeo">
            <Input value={String(p.url)} onChange={e => set('url', e.target.value)} className="text-sm" />
          </Field>
          <Field label="Texto do thumbnail">
            <Input value={String(p.thumbnailText)} onChange={e => set('thumbnailText', e.target.value)} className="text-sm" />
          </Field>
          <Field label="Largura">
            <Input value={String(p.width)} onChange={e => set('width', e.target.value)} className="text-sm" placeholder="100% ou 480px" />
          </Field>
        </>
      )}
      {block.type === 'spacer' && (
        <Field label="Altura (px)">
          <div className="flex items-center gap-3">
            <Slider value={[Number(p.height)]} onValueChange={([v]) => set('height', v)} min={8} max={120} step={4} className="flex-1" />
            <span className="text-xs text-muted-foreground w-8 text-right">{String(p.height)}px</span>
          </div>
        </Field>
      )}
      {block.type === 'feed' && (
        <>
          <Field label="Número de itens">
            <Select value={String(p.items)} onValueChange={v => set('items', Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'item' : 'itens'}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Layout">
            <Select value={String(p.layout)} onValueChange={v => set('layout', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="grid">Grade</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      )}
      {block.type === 'social' && (
        <>
          <Field label="Redes sociais">
            <div className="space-y-1.5">
              {['facebook','instagram','twitter','linkedin','youtube','tiktok'].map(net => {
                const active = ((p.networks as string[]) || []).includes(net);
                return (
                  <label key={net} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={() => {
                        const cur = (p.networks as string[]) || [];
                        set('networks', active ? cur.filter(n => n !== net) : [...cur, net]);
                      }}
                      className="rounded"
                    />
                    <span className="capitalize">{net}</span>
                  </label>
                );
              })}
            </div>
          </Field>
          <Field label="Tamanho dos ícones">
            <div className="flex items-center gap-3">
              <Slider value={[Number(p.iconSize)]} onValueChange={([v]) => set('iconSize', v)} min={20} max={48} step={2} className="flex-1" />
              <span className="text-xs text-muted-foreground w-8 text-right">{String(p.iconSize)}px</span>
            </div>
          </Field>
          <Field label="Alinhamento">
            <AlignSelect value={String(p.align)} onChange={v => set('align', v)} />
          </Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AlignSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="left">Esquerda</SelectItem>
        <SelectItem value="center">Centro</SelectItem>
        <SelectItem value="right">Direita</SelectItem>
      </SelectContent>
    </Select>
  );
}
