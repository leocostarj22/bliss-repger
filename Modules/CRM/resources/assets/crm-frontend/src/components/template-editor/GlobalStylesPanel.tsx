import { type GlobalStyles, SAFE_FONTS } from '@/types/template';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Palette } from 'lucide-react';

interface Props {
  value: GlobalStyles;
  onChange: (gs: GlobalStyles) => void;
}

export function GlobalStylesPanel({ value, onChange }: Props) {
  const set = <K extends keyof GlobalStyles>(key: K, val: GlobalStyles[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className="h-full w-full shrink-0 border-l border-border bg-card p-4 space-y-5 overflow-y-auto">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Palette className="w-3.5 h-3.5" /> Estilos Globais do Template
      </h3>

      <Field label="Fundo do email">
        <ColorSwatch
          label="Cor exterior (volta do email)"
          value={value.canvasBgColor}
          onChange={v => set('canvasBgColor', v)}
        />
      </Field>

      <Field label="Fundo do conteúdo">
        <ColorSwatch
          label="Cor da área central"
          value={value.contentBgColor}
          onChange={v => set('contentBgColor', v)}
        />
      </Field>

      <Field label="Família de fontes">
        <Select value={value.fontFamily} onValueChange={v => set('fontFamily', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SAFE_FONTS.map(f => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.css }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] text-muted-foreground mt-1">
          Fontes compatíveis com os principais clientes de email.
        </p>
      </Field>

      <Field label={`Largura máxima — ${value.contentMaxWidth}px`}>
        <Slider
          value={[value.contentMaxWidth]}
          onValueChange={([v]) => set('contentMaxWidth', v)}
          min={400}
          max={800}
          step={20}
        />
      </Field>

      <p className="text-xs text-muted-foreground pt-2 border-t border-border">
        Estas definições aplicam-se ao template completo. Cada bloco pode ter estilos individuais que substituem os globais.
      </p>
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

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <label className="flex items-center gap-2 h-8 px-2 rounded-md border border-border bg-background cursor-pointer hover:bg-muted/40 transition-colors">
        <input
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0"
          style={{ appearance: 'none' }}
        />
        <span className="text-xs font-mono text-muted-foreground truncate">{value}</span>
      </label>
    </div>
  );
}
