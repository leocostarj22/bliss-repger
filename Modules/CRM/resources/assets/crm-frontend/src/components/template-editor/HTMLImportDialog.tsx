import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Type, Image, MousePointerClick, Minus, LayoutGrid, Code2, AlertCircle, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TemplateBlock } from '@/types/template';
import { DEFAULT_BLOCK_PROPS } from '@/types/template';
import { v4Fallback } from '@/lib/id';

// ─── Parser ─────────────────────────────────────────────────────────────────

function isTextTag(tag: string) {
  return ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'blockquote', 'pre'].includes(tag);
}

function isButtonLike(el: HTMLElement): boolean {
  const style = el.style;
  if (style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== '') return true;
  if (style.display === 'inline-block' && style.padding) return true;
  const cls = el.className?.toLowerCase() || '';
  if (cls.includes('button') || cls.includes('btn') || cls.includes('cta')) return true;
  return false;
}

function mkText(html: string): TemplateBlock {
  return { id: v4Fallback(), type: 'text', props: { ...DEFAULT_BLOCK_PROPS.text, content: html } };
}

function mkImage(img: HTMLImageElement, hyperlink = ''): TemplateBlock {
  return {
    id: v4Fallback(), type: 'image',
    props: { ...DEFAULT_BLOCK_PROPS.image, src: img.getAttribute('src') || '', alt: img.alt || '', hyperlink },
  };
}

function mkButton(a: HTMLAnchorElement): TemplateBlock {
  return {
    id: v4Fallback(), type: 'button',
    props: {
      ...DEFAULT_BLOCK_PROPS.button,
      text: a.textContent?.trim() || 'Clique Aqui',
      url: a.getAttribute('href') || '#',
      bgColor: a.style.backgroundColor || DEFAULT_BLOCK_PROPS.button.bgColor,
      textColor: a.style.color || DEFAULT_BLOCK_PROPS.button.textColor,
    },
  };
}

function mkDivider(): TemplateBlock {
  return { id: v4Fallback(), type: 'divider', props: { ...DEFAULT_BLOCK_PROPS.divider } };
}

function mkSpacer(): TemplateBlock {
  return { id: v4Fallback(), type: 'spacer', props: { height: 16 } };
}

function processNodes(nodes: ChildNode[]): TemplateBlock[] {
  const blocks: TemplateBlock[] = [];
  const textBuf: string[] = [];

  const flushText = () => {
    if (textBuf.length > 0) {
      blocks.push(mkText(textBuf.join('\n')));
      textBuf.length = 0;
    }
  };

  for (const node of nodes) {
    // Plain text node
    if (node.nodeType === Node.TEXT_NODE) {
      const t = node.textContent?.trim();
      if (t) textBuf.push(`<p>${t}</p>`);
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // ── Divider ──────────────────────────────────────────────────────────
    if (tag === 'hr') { flushText(); blocks.push(mkDivider()); continue; }

    // ── Standalone image ─────────────────────────────────────────────────
    if (tag === 'img') { flushText(); blocks.push(mkImage(el as HTMLImageElement)); continue; }

    // ── Anchor ───────────────────────────────────────────────────────────
    if (tag === 'a') {
      const a = el as HTMLAnchorElement;
      const imgChild = a.querySelector('img');
      if (imgChild) { flushText(); blocks.push(mkImage(imgChild, a.getAttribute('href') || '')); continue; }
      if (isButtonLike(a)) { flushText(); blocks.push(mkButton(a)); continue; }
      textBuf.push(`<p>${el.outerHTML}</p>`);
      continue;
    }

    // ── Text-like elements ────────────────────────────────────────────────
    if (isTextTag(tag)) {
      // Paragraph wrapping a single image
      const imgChild = el.querySelector(':scope > img');
      const aChild = el.querySelector(':scope > a');

      if (imgChild && el.children.length === 1) {
        flushText();
        blocks.push(mkImage(imgChild as HTMLImageElement));
        continue;
      }
      if (aChild) {
        const imgInLink = aChild.querySelector('img');
        if (imgInLink && aChild.children.length === 1 && el.children.length === 1) {
          flushText();
          blocks.push(mkImage(imgInLink as HTMLImageElement, aChild.getAttribute('href') || ''));
          continue;
        }
        if (isButtonLike(aChild as HTMLElement) && el.children.length === 1) {
          flushText();
          blocks.push(mkButton(aChild as HTMLAnchorElement));
          continue;
        }
      }

      textBuf.push(el.outerHTML);
      continue;
    }

    // ── Table → try to detect column layout ──────────────────────────────
    if (tag === 'table') {
      const rows = el.querySelectorAll(':scope > tbody > tr, :scope > tr');
      if (rows.length === 1) {
        const cells = Array.from(rows[0].querySelectorAll(':scope > td, :scope > th'));
        if (cells.length >= 2 && cells.length <= 4) {
          flushText();
          const children: TemplateBlock[] = cells.map(cell => {
            const inner = processNodes(Array.from(cell.childNodes));
            return inner[0] ?? mkSpacer();
          });
          blocks.push({
            id: v4Fallback(), type: 'columns',
            props: { ...DEFAULT_BLOCK_PROPS.columns, columns: cells.length },
            children,
          });
          continue;
        }
      }
      // Fallback: treat as raw HTML block
      flushText();
      blocks.push({ id: v4Fallback(), type: 'html', props: { code: el.outerHTML } });
      continue;
    }

    // ── Container elements → recurse ─────────────────────────────────────
    if (['div', 'section', 'article', 'header', 'footer', 'main', 'center', 'span'].includes(tag)) {
      if (!el.textContent?.trim() && !el.querySelector('img')) continue;

      const directDivs = Array.from(el.children).filter(
        c => ['div', 'td'].includes(c.tagName.toLowerCase()),
      );

      // Column detection: 2-4 sibling divs with explicit width/float styling
      if (directDivs.length >= 2 && directDivs.length <= 4 && directDivs.length === el.children.length) {
        const looksLikeColumns = directDivs.some(c => {
          const s = (c as HTMLElement).style;
          return s.float || s.display === 'inline-block' || s.width || s.maxWidth || s.flex;
        });
        if (looksLikeColumns) {
          flushText();
          const children: TemplateBlock[] = directDivs.map(child => {
            const inner = processNodes(Array.from(child.childNodes));
            return inner[0] ?? mkSpacer();
          });
          blocks.push({
            id: v4Fallback(), type: 'columns',
            props: { ...DEFAULT_BLOCK_PROPS.columns, columns: directDivs.length },
            children,
          });
          continue;
        }
      }

      // Otherwise recurse normally
      flushText();
      const inner = processNodes(Array.from(el.childNodes));
      blocks.push(...inner);
      continue;
    }

    // ── Anything else with content → treat as text ────────────────────────
    if (el.textContent?.trim()) {
      textBuf.push(`<p>${el.innerHTML}</p>`);
    }
  }

  flushText();
  return blocks;
}

export function htmlToBlocks(html: string): TemplateBlock[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return processNodes(Array.from(doc.body.childNodes));
}

// ─── Block type display info ─────────────────────────────────────────────────

const BLOCK_META: Record<string, { label: string; Icon: React.ElementType }> = {
  text:    { label: 'Texto',     Icon: Type },
  image:   { label: 'Imagem',    Icon: Image },
  button:  { label: 'Botão',     Icon: MousePointerClick },
  divider: { label: 'Separador', Icon: Minus },
  columns: { label: 'Colunas',   Icon: LayoutGrid },
  html:    { label: 'HTML',      Icon: Code2 },
  spacer:  { label: 'Espaço',    Icon: Minus },
};

// ─── Dialog ──────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (blocks: TemplateBlock[], mode: 'replace' | 'append') => void;
}

export function HTMLImportDialog({ open, onOpenChange, onImport }: Props) {
  const [html, setHtml] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

  const parsed = useMemo(() => {
    if (!html.trim()) return [];
    try { return htmlToBlocks(html); } catch { return []; }
  }, [html]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    parsed.forEach(b => { c[b.type] = (c[b.type] || 0) + 1; });
    return c;
  }, [parsed]);

  const handleImport = () => {
    if (!parsed.length) return;
    onImport(parsed, mode);
    setHtml('');
    onOpenChange(false);
  };

  const handleClose = () => { setHtml(''); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code2 className="w-4 h-4" /> Importar HTML
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Cole o HTML abaixo — o editor converte automaticamente em blocos editáveis
            </Label>
            <Textarea
              value={html}
              onChange={e => setHtml(e.target.value)}
              placeholder={
                '<h1>Título</h1>\n' +
                '<p>Parágrafo de introdução...</p>\n' +
                '<img src="https://..." alt="Banner" />\n' +
                '<a href="#" style="background-color:#1a8a8a;color:#fff;padding:12px 24px;display:inline-block;">Ver mais</a>\n' +
                '<hr />\n' +
                '<p>Rodapé</p>'
              }
              className="font-mono text-xs h-52 resize-none"
              spellCheck={false}
            />
          </div>

          {/* Live preview */}
          {html.trim() && (
            <div className="border border-border rounded-lg p-3 bg-muted/20">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                {parsed.length === 0 ? (
                  <span className="text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Nenhum bloco detectado
                  </span>
                ) : (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {parsed.length} bloco{parsed.length !== 1 ? 's' : ''} detectado{parsed.length !== 1 ? 's' : ''}
                  </span>
                )}
              </p>
              {parsed.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(counts).map(([type, count]) => {
                    const meta = BLOCK_META[type];
                    if (!meta) return null;
                    const { Icon } = meta;
                    return (
                      <div
                        key={type}
                        className="flex items-center gap-1.5 text-xs bg-background border border-border rounded px-2 py-1"
                      >
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        <span>{meta.label}</span>
                        <span className="font-semibold text-primary">×{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Mode selection */}
          <div className="flex gap-3">
            {(['replace', 'append'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-lg border p-3 text-left text-sm transition-colors cursor-pointer',
                  mode === m
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary/40 text-foreground',
                )}
              >
                <div className="font-medium">
                  {m === 'replace' ? 'Substituir tudo' : 'Adicionar ao final'}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {m === 'replace'
                    ? 'O conteúdo actual será substituído pelos novos blocos'
                    : 'Os blocos importados serão adicionados ao final do template'}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3 shrink-0">
          <Button variant="outline" size="sm" onClick={handleClose}>Cancelar</Button>
          <Button size="sm" disabled={parsed.length === 0} onClick={handleImport}>
            Converter{parsed.length > 0 ? ` (${parsed.length} blocos)` : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
