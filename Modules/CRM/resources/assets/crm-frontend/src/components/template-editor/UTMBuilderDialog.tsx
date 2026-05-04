import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Copy, Check, Link } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseUrl: string;
  onApply: (url: string) => void;
}

export function UTMBuilderDialog({ open, onOpenChange, baseUrl, onApply }: Props) {
  const [source, setSource] = useState('newsletter');
  const [medium, setMedium] = useState('email');
  const [campaign, setCampaign] = useState('');
  const [term, setTerm] = useState('');
  const [content, setContent] = useState('');
  const [copied, setCopied] = useState(false);

  const builtUrl = useMemo(() => {
    const base = baseUrl.split('?')[0];
    if (!base || base === '#') return baseUrl;
    const params = new URLSearchParams();
    if (source.trim()) params.set('utm_source', source.trim());
    if (medium.trim()) params.set('utm_medium', medium.trim());
    if (campaign.trim()) params.set('utm_campaign', campaign.trim());
    if (term.trim()) params.set('utm_term', term.trim());
    if (content.trim()) params.set('utm_content', content.trim());
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  }, [baseUrl, source, medium, campaign, term, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(builtUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    onApply(builtUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="w-4 h-4" /> UTM Builder
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL base</Label>
            <div className="text-xs font-mono bg-muted rounded px-3 py-2 break-all text-muted-foreground">
              {baseUrl || '(sem URL definida)'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="utm_source *" hint="ex: newsletter, bliss">
              <Input value={source} onChange={e => setSource(e.target.value)} className="text-sm" placeholder="newsletter" />
            </Field>
            <Field label="utm_medium *" hint="ex: email, cpc">
              <Input value={medium} onChange={e => setMedium(e.target.value)} className="text-sm" placeholder="email" />
            </Field>
            <Field label="utm_campaign *" hint="ex: promo_maio_2025">
              <Input value={campaign} onChange={e => setCampaign(e.target.value)} className="text-sm" placeholder="campanha" />
            </Field>
            <Field label="utm_content" hint="identifica o link específico">
              <Input value={content} onChange={e => setContent(e.target.value)} className="text-sm" placeholder="botao_hero" />
            </Field>
            <Field label="utm_term" hint="palavras-chave (opcional)">
              <Input value={term} onChange={e => setTerm(e.target.value)} className="text-sm" placeholder="" />
            </Field>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">URL gerada</Label>
            <div className="text-xs font-mono bg-muted rounded px-3 py-2 break-all text-foreground border border-border">
              {builtUrl || '—'}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopy} disabled={!builtUrl}>
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
            <Button size="sm" onClick={handleApply} disabled={!builtUrl || builtUrl === '#'}>
              Aplicar URL
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
