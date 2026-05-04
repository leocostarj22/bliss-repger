import { useState, useRef, useCallback, useEffect } from 'react';
import type { TemplateBlock } from '@/types/template';
import { DEFAULT_BLOCK_PROPS, SAFE_FONTS } from '@/types/template';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ImagePlus, Sparkles, Trash2, Link } from 'lucide-react';
import { handleImageUpload } from '@/lib/tiptap-utils';
import { toast } from 'react-hot-toast';
import { fetchEmailMedia, deleteEmailMedia, type EmailMediaItem } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { v4Fallback } from '@/lib/id';
import { AiTextDialog } from './AiTextDialog';
import { StockMediaDialog } from './StockMediaDialog';
import { UTMBuilderDialog } from './UTMBuilderDialog';
import { HtmlVisualEditor } from './HtmlVisualEditor';
import { RichTextEditor } from '@/components/ui/rich-text-editor';

function getVideoThumbnailUrl(url: string): string | null {
  if (!url) return null;
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return null;
  return null;
}

interface Props {
  block: TemplateBlock;
  onChange: (props: Record<string, unknown>) => void;
  onUpdateBlock?: (block: TemplateBlock) => void;
  onConvertHtml?: (htmlCode: string) => void;
}

export function PropertiesPanel({ block, onChange, onUpdateBlock, onConvertHtml }: Props) {
  const p = block.props;
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  const [isLoadingThumbnail, setIsLoadingThumbnail] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<EmailMediaItem[]>([]);
  const [mediaSearch, setMediaSearch] = useState('');
  const [mediaColumnIndex, setMediaColumnIndex] = useState<number | null>(null);
  const set = (key: string, val: unknown) => onChange({ ...p, [key]: val });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [aiTextOpen, setAiTextOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [stockDefaultType, setStockDefaultType] = useState<'images' | 'videos'>('images');
  const [utmOpen, setUtmOpen] = useState(false);
  const [utmTarget, setUtmTarget] = useState<'url' | 'hyperlink'>('url');

  useEffect(() => {
    if (block.type === 'video' && p.url) {
      const thumbnailUrl = getVideoThumbnailUrl(String(p.url));
      if (thumbnailUrl) {
        setIsLoadingThumbnail(true);
        setVideoThumbnail(thumbnailUrl);
        onChange({ ...p, thumbnailUrl, thumbnailText: p.thumbnailText || 'Assista ao vídeo' });
        setIsLoadingThumbnail(false);
      } else { setVideoThumbnail(null); }
    }
  }, [block.type, p.url, onChange]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const toastId = toast.loading("Enviando imagem...");
    try {
      const url = await handleImageUpload(file);
      set('src', url);
      toast.success("Imagem enviada com sucesso", { id: toastId });
    } catch { toast.error("Erro ao enviar imagem", { id: toastId }); }
    finally { if (fileInputRef.current) fileInputRef.current.value = ""; }
  };

  useEffect(() => {
    if (!mediaOpen) return;
    setMediaLoading(true);
    fetchEmailMedia()
      .then(r => setMediaItems(r.data))
      .catch(() => toast.error('Falha ao carregar imagens do servidor'))
      .finally(() => setMediaLoading(false));
  }, [mediaOpen]);

  const filteredMedia = mediaSearch.trim().toLowerCase()
    ? mediaItems.filter(m => m.filename.toLowerCase().includes(mediaSearch.trim().toLowerCase()))
    : mediaItems;

  const updateChild = (index: number, child?: TemplateBlock) => {
    if (!onUpdateBlock) return;
    const children = [...(block.children || [])] as (TemplateBlock | undefined)[];
    children[index] = child as any;
    onUpdateBlock({ ...block, children: children as TemplateBlock[] });
  };

  const createChildOfType = (index: number, type: string) => {
    const newChild: TemplateBlock = { id: v4Fallback(), type, props: { ...getDefaultProps(type) } } as TemplateBlock;
    updateChild(index, newChild);
  };

  const updateChildProp = (index: number, key: string, value: unknown) => {
    const child = block.children?.[index];
    if (!child || !onUpdateBlock) return;
    const newChild: TemplateBlock = { ...child, props: { ...(child.props || {}), [key]: value } } as TemplateBlock;
    updateChild(index, newChild);
  };

  return (
    <div className="h-full w-full shrink-0 border-l border-border bg-card p-4 space-y-5 overflow-y-auto">
      <Dialog open={mediaOpen} onOpenChange={setMediaOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Biblioteca de imagens</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={mediaSearch} onChange={e => setMediaSearch(e.target.value)} placeholder="Pesquisar..." className="text-sm" />
            {mediaLoading ? <div className="text-sm text-muted-foreground">Carregando...</div>
              : filteredMedia.length === 0 ? <div className="text-sm text-muted-foreground">Nenhuma imagem encontrada.</div>
                : <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-auto pr-1">
                  {filteredMedia.map(item => (
                    <div key={item.url} className="relative">
                      <button type="button" className="group w-full rounded-md border border-border bg-card hover:bg-accent/40 text-left overflow-hidden"
                        onClick={() => {
                          if (mediaColumnIndex !== null && onUpdateBlock) {
                            const child = block.children?.[mediaColumnIndex];
                            if (child && child.type === 'image') {
                              const newChild: TemplateBlock = { ...child, props: { ...(child.props || {}), src: item.url } } as TemplateBlock;
                              const children = [...(block.children || [])];
                              children[mediaColumnIndex] = newChild;
                              onUpdateBlock({ ...block, children });
                            }
                            setMediaColumnIndex(null);
                          } else { set('src', item.url); }
                          setMediaOpen(false);
                        }} title={item.filename}>
                        <div className="aspect-video bg-muted overflow-hidden">
                          <img src={item.url} alt={item.filename} className="h-full w-full object-cover group-hover:scale-[1.01] transition-transform" loading="lazy" />
                        </div>
                        <div className="p-2"><div className="text-xs font-medium truncate">{item.filename}</div></div>
                      </button>
                      <button type="button" className="absolute right-2 top-2 z-10 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground p-1 shadow"
                        title="Eliminar imagem do servidor"
                        onClick={(e) => {
                          e.preventDefault(); e.stopPropagation();
                          if (!confirm('Eliminar esta imagem do servidor?')) return;
                          deleteEmailMedia(item.filename)
                            .then(() => { setMediaItems(prev => prev.filter(m => m.filename !== item.filename)); toast.success('Imagem eliminada'); })
                            .catch(() => toast.error('Falha ao eliminar imagem'));
                        }}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>}
            <div className="text-xs text-muted-foreground">Dica: imagens enviadas ficam em crm-media.</div>
          </div>
        </DialogContent>
      </Dialog>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propriedades — {block.type}</h3>

      <AiTextDialog open={aiTextOpen} onOpenChange={setAiTextOpen} currentContent={block.type === 'text' ? String(p.content || '') : ''} onApply={(html) => set('content', html)} />
      <StockMediaDialog open={stockOpen} onOpenChange={setStockOpen} defaultType={stockDefaultType} onSelectImage={(url, alt) => onChange({ ...p, src: url, alt })} onSelectVideo={(url) => onChange({ ...p, url })} />
      <UTMBuilderDialog open={utmOpen} onOpenChange={setUtmOpen} baseUrl={utmTarget === 'url' ? String(p.url || '') : String(p.hyperlink || '')} onApply={(url) => set(utmTarget, url)} />

      {block.type === 'text' && (
        <>
          <Field label="Conteúdo">
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 border-dashed text-primary hover:text-primary hover:bg-primary/5" onClick={() => setAiTextOpen(true)}>
                <Sparkles className="w-3.5 h-3.5" /> Escrever com IA
              </Button>
              <RichTextEditor value={String(p.content || '')} onChange={(html) => set('content', html)} />
            </div>
          </Field>
          <Field label="Tamanho da fonte">
            <SliderWithValue value={Number((p as any).fontSize ?? 16)} onChange={v => set('fontSize', v)} min={10} max={48} step={1} suffix="px" />
          </Field>
          <Field label="Espaçamento entre linhas">
            <SliderWithValue value={Number((p as any).lineHeight ?? 1.5)} onChange={v => set('lineHeight', v)} min={1} max={2.4} step={0.1} />
          </Field>
          <Field label="Cores">
            <div className="grid grid-cols-2 gap-2">
              <ColorSwatch label="Texto" value={String(p.color || '#333333')} onChange={v => set('color', v)} />
              <ColorSwatch label="Fundo" value={String((p as any).bgColor || '#ffffff')} onChange={v => set('bgColor', v)} />
            </div>
          </Field>
          <Field label="Alinhamento"><AlignSelect value={String(p.align)} onChange={v => set('align', v)} /></Field>
          <Field label="Família de fontes">
            <Select value={String((p as any).fontFamily || 'inherit')} onValueChange={v => set('fontFamily', v === 'inherit' ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inherit">Herdar do template</SelectItem>
                {SAFE_FONTS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </>
      )}

      {block.type === 'image' && (
        <>
          <Field label="Imagem">
            <div className="flex gap-2">
              <Input value={String(p.src)} onChange={e => set('src', e.target.value)} className="text-sm" placeholder="https://..." />
              <Button variant="outline" size="icon" className="shrink-0" onClick={() => fileInputRef.current?.click()} title="Carregar do PC"><ImagePlus className="h-4 w-4" /></Button>
            </div>
            {String(p.src) && <div className="mt-2 rounded-md overflow-hidden border border-border bg-muted aspect-video"><img src={String(p.src)} alt={String(p.alt || '')} className="w-full h-full object-contain" /></div>}
            <div className="mt-2 flex flex-col gap-1.5">
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => { setMediaColumnIndex(null); setMediaOpen(true); }}>Escolher do servidor</Button>
              <Button type="button" variant="outline" size="sm" className="w-full gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
                onClick={() => { setStockDefaultType('images'); setStockOpen(true); }}>
                <ImagePlus className="w-3.5 h-3.5" /> Banco de imagens (Pexels)
              </Button>
            </div>
          </Field>
          <Field label="Largura">
            {(() => {
              const raw = String(p.width ?? '100%');
              const pct = raw.match(/^(\d+)%$/) ? parseInt(raw) : null;
              return <div className="space-y-2">
                {pct !== null ? <SliderWithValue value={pct} onChange={v => set('width', v + '%')} min={10} max={100} step={5} suffix="%" /> : null}
                <Input value={raw} onChange={e => set('width', e.target.value)} className="text-sm" placeholder="100% ou 300px" />
              </div>;
            })()}
          </Field>
          <Field label="Altura máxima">
            {(() => {
              const raw = String(p.maxHeight ?? 'auto');
              const px = raw.match(/^(\d+)px$/) ? parseInt(raw) : null;
              return <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={raw !== 'auto'} onChange={e => set('maxHeight', e.target.checked ? '400px' : 'auto')} className="rounded" id="maxh-toggle" />
                  <label htmlFor="maxh-toggle" className="text-xs text-muted-foreground cursor-pointer">Limitar altura</label>
                </div>
                {px !== null && <SliderWithValue value={px} onChange={v => set('maxHeight', v + 'px')} min={50} max={800} step={10} suffix="px" />}
              </div>;
            })()}
          </Field>
          <Field label="Ajuste da imagem">
            <Select value={String(p.objectFit ?? 'cover')} onValueChange={v => set('objectFit', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cover">Cobrir (recortar)</SelectItem>
                <SelectItem value="contain">Conter (sem recorte)</SelectItem>
                <SelectItem value="fill">Esticar</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Borda arredondada">
            <SliderWithValue value={Number(p.borderRadius ?? 0)} onChange={v => set('borderRadius', v)} min={0} max={48} step={2} suffix="px" />
          </Field>
          <Field label="Alinhamento"><AlignSelect value={String(p.align ?? 'center')} onChange={v => set('align', v)} /></Field>
          <Field label="Texto alternativo"><Input value={String(p.alt || '')} onChange={e => set('alt', e.target.value)} className="text-sm" placeholder="Descrição da imagem" /></Field>
          <Field label="Hyperlink (opcional)">
            <div className="flex gap-2">
              <Input value={String(p.hyperlink || '')} onChange={e => set('hyperlink', e.target.value)} className="text-sm" placeholder="https://exemplo.com" />
              <Button type="button" variant="outline" size="icon" className="shrink-0" title="Construir URL com parâmetros UTM" onClick={() => { setUtmTarget('hyperlink'); setUtmOpen(true); }}><Link className="h-4 w-4" /></Button>
            </div>
          </Field>
        </>
      )}

      {block.type === 'button' && (
        <>
          <Field label="Texto do botão"><Input value={String(p.text)} onChange={e => set('text', e.target.value)} className="text-sm" /></Field>
          <Field label="URL">
            <div className="flex gap-2">
              <Input value={String(p.url)} onChange={e => set('url', e.target.value)} className="text-sm" placeholder="https://exemplo.com" />
              <Button type="button" variant="outline" size="icon" className="shrink-0" title="Construir URL com parâmetros UTM" onClick={() => { setUtmTarget('url'); setUtmOpen(true); }}><Link className="h-4 w-4" /></Button>
            </div>
          </Field>
          <Field label="Cores">
            <div className="grid grid-cols-2 gap-2">
              <ColorSwatch label="Fundo" value={String(p.bgColor || '#1a8a8a')} onChange={v => set('bgColor', v)} />
              <ColorSwatch label="Texto" value={String(p.textColor || '#ffffff')} onChange={v => set('textColor', v)} />
            </div>
          </Field>
          <Field label="Tamanho da fonte"><SliderWithValue value={Number(p.fontSize ?? 16)} onChange={v => set('fontSize', v)} min={10} max={32} step={1} suffix="px" /></Field>
          <Field label="Padding (px)">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1"><span className="text-[11px] text-muted-foreground">Vertical</span><SliderWithValue value={Number(p.paddingV ?? 12)} onChange={v => set('paddingV', v)} min={4} max={32} step={2} suffix="px" /></div>
              <div className="space-y-1"><span className="text-[11px] text-muted-foreground">Horizontal</span><SliderWithValue value={Number(p.paddingH ?? 24)} onChange={v => set('paddingH', v)} min={8} max={64} step={4} suffix="px" /></div>
            </div>
          </Field>
          <Field label="Borda arredondada"><SliderWithValue value={Number(p.borderRadius ?? 6)} onChange={v => set('borderRadius', v)} min={0} max={32} step={1} suffix="px" /></Field>
          <Field label="Alinhamento"><AlignSelect value={String(p.align)} onChange={v => set('align', v)} /></Field>
        </>
      )}

      {block.type === 'divider' && (
        <>
          <Field label="Estilo">
            <Select value={String(p.style ?? 'solid')} onValueChange={v => set('style', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solid">Sólido</SelectItem>
                <SelectItem value="dashed">Tracejado</SelectItem>
                <SelectItem value="dotted">Pontilhado</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Espessura"><SliderWithValue value={Number(p.height ?? 1)} onChange={v => set('height', v)} min={1} max={8} step={1} suffix="px" /></Field>
          <Field label="Cor"><ColorSwatch label="Linha" value={String(p.color || '#e0e0e0')} onChange={v => set('color', v)} /></Field>
          <Field label="Margem vertical"><SliderWithValue value={Number(p.margin ?? 16)} onChange={v => set('margin', v)} min={0} max={48} step={4} suffix="px" /></Field>
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
          <Field label="Espaçamento entre colunas"><SliderWithValue value={Number(p.gap ?? 16)} onChange={v => set('gap', v)} min={0} max={32} step={4} suffix="px" /></Field>
          <div className="pt-3 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Aparência do Container</h4>
            <Field label="Cor de fundo do container"><ColorSwatch label="Fundo geral" value={String(p.bgColor || '#ffffff')} onChange={v => set('bgColor', v)} /></Field>
            <Field label="Cantos arredondados"><SliderWithValue value={Number(p.borderRadius ?? 0)} onChange={v => set('borderRadius', v)} min={0} max={24} step={2} suffix="px" /></Field>
          </div>
          <div className="pt-3 border-t border-border space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conteúdo das Colunas</h4>
            {Array.from({ length: Number(p.columns) }).map((_, i) => {
              const child = block.children?.[i] as TemplateBlock | undefined;
              const colBgColors = (p.columnBgColors as string[] | undefined) || [];
              const colBg = colBgColors[i] || '#ffffff';
              const setColBg = (color: string) => { const updated = [...colBgColors]; updated[i] = color; set('columnBgColors', updated); };
              return (
                <div key={i} className="rounded-lg border border-border p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">Coluna {i + 1}</div>
                    {child && <Button variant="outline" size="sm" onClick={() => updateChild(i, undefined)}>Limpar</Button>}
                  </div>
                  <ColorSwatch label="Cor de fundo da coluna" value={colBg} onChange={setColBg} />
                  <div>
                    {!child ? <Select onValueChange={(v) => createChildOfType(i, v)}>
                      <SelectTrigger><SelectValue placeholder="Escolher tipo de bloco" /></SelectTrigger>
                      <SelectContent>
                        {(['text', 'image', 'button', 'divider', 'spacer'] as string[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select> : child.type === 'text' ? <RichTextEditor value={String((child.props as any)?.content || '')} onChange={(html) => updateChildProp(i, 'content', html)} className="text-sm" />
                      : child.type === 'image' ? <div className="space-y-2">
                        <Input value={String((child.props as any)?.src || '')} onChange={e => updateChildProp(i, 'src', e.target.value)} className="text-sm" placeholder="URL da imagem" />
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1" onClick={() => { setMediaColumnIndex(i); setMediaOpen(true); }}>Escolher do servidor</Button>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Borda arredondada</Label>
                          <SliderWithValue value={Number((child.props as any)?.borderRadius ?? 0)} onChange={v => updateChildProp(i, 'borderRadius', v)} min={0} max={48} step={2} suffix="px" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] text-muted-foreground">Ajuste da imagem</Label>
                          <Select value={String((child.props as any)?.objectFit ?? 'cover')} onValueChange={v => updateChildProp(i, 'objectFit', v)}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cover">Cobrir (recortar)</SelectItem>
                              <SelectItem value="contain">Conter</SelectItem>
                              <SelectItem value="fill">Esticar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      : child.type === 'button' ? <div className="space-y-2">
                        <Input value={String((child.props as any)?.text || '')} onChange={e => updateChildProp(i, 'text', e.target.value)} className="text-sm" placeholder="Texto do botão" />
                        <Input value={String((child.props as any)?.url || '')} onChange={e => updateChildProp(i, 'url', e.target.value)} className="text-sm" placeholder="URL" />
                      </div>
                      : child.type === 'divider' ? <div><Label className="text-xs">Espessura</Label><Slider value={[Number((child.props as any)?.height || 1)]} onValueChange={([v]) => updateChildProp(i, 'height', v)} min={1} max={8} step={1} /></div>
                      : child.type === 'spacer' ? <div><Label className="text-xs">Altura</Label><Slider value={[Number((child.props as any)?.height || 16)]} onValueChange={([v]) => updateChildProp(i, 'height', v)} min={8} max={120} step={4} /></div>
                      : <div className="text-xs text-muted-foreground">Edição rápida indisponível para "{child.type}"</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {block.type === 'html' && (
        <Field label="HTML Personalizado">
          <HtmlVisualEditor
            html={String(p.code)}
            onChange={(newHtml) => set('code', newHtml)}
            onConvertToBlocks={onConvertHtml ? () => onConvertHtml(String(p.code)) : undefined}
          />
        </Field>
      )}

      {block.type === 'video' && (
        <>
          <Field label="URL do vídeo">
            <Input value={String(p.url)} onChange={e => set('url', e.target.value)} className="text-sm" placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..." />
            <div className="mt-2">
              <Button type="button" variant="outline" className="w-full gap-1.5 text-primary border-primary/40 hover:bg-primary/5" onClick={() => { setStockDefaultType('videos'); setStockOpen(true); }}>
                <ImagePlus className="w-4 h-4" /> Banco de vídeos (Pexels)
              </Button>
            </div>
          </Field>
          {(videoThumbnail || p.thumbnailUrl) && (
            <Field label="Thumbnail do vídeo">
              <div className="space-y-2">
                <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                  <img src={videoThumbnail || String(p.thumbnailUrl ?? '')} alt="Thumbnail do vídeo" className="w-full h-full object-cover" onError={() => setVideoThumbnail(null)} />
                  {isLoadingThumbnail && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center"><span className="text-white text-sm">Carregando...</span></div>}
                </div>
                <p className="text-xs text-muted-foreground">Thumbnail extraída automaticamente do vídeo</p>
              </div>
            </Field>
          )}
          <Field label="Texto do thumbnail"><Input value={String(p.thumbnailText)} onChange={e => set('thumbnailText', e.target.value)} className="text-sm" /></Field>
          <Field label="Largura"><Input value={String(p.width)} onChange={e => set('width', e.target.value)} className="text-sm" placeholder="100% ou 480px" /></Field>
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
                {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n} {n === 1 ? 'item' : 'itens'}</SelectItem>)}
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
            <div className="space-y-3">
              {['facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok'].map(net => {
                const active = ((p.networks as string[]) || []).includes(net);
                return (
                  <div key={net} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={active} onChange={() => {
                        const cur = (p.networks as string[]) || [];
                        set('networks', active ? cur.filter(n => n !== net) : [...cur, net]);
                      }} className="rounded border-gray-300 text-primary focus:ring-primary" />
                      <span className="capitalize">{net}</span>
                    </label>
                    {active && <Input value={(p.links as Record<string, string>)?.[net] || ''} onChange={(e) => {
                      const links = (p.links as Record<string, string>) || {};
                      set('links', { ...links, [net]: e.target.value });
                    }} placeholder={`URL do ${net}`} className="h-7 text-xs" />}
                  </div>
                );
              })}
            </div>
          </Field>
          <Field label="Cor dos ícones"><ColorSwatch label="Cor" value={String(p.color || '#333333')} onChange={v => set('color', v)} /></Field>
          <Field label="Tamanho dos ícones"><SliderWithValue value={Number(p.iconSize ?? 28)} onChange={v => set('iconSize', v)} min={20} max={48} step={2} suffix="px" /></Field>
          <Field label="Alinhamento"><AlignSelect value={String(p.align)} onChange={v => set('align', v)} /></Field>
        </>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
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

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <label className="flex items-center gap-2 h-8 px-2 rounded-md border border-border bg-background cursor-pointer hover:bg-muted/40 transition-colors">
        <input type="color" value={value} onChange={e => onChange(e.target.value)} className="w-5 h-5 rounded cursor-pointer border-0 p-0 bg-transparent flex-shrink-0" style={{ appearance: 'none' }} />
        <span className="text-xs font-mono text-muted-foreground truncate">{value}</span>
      </label>
    </div>
  );
}

function SliderWithValue({ value, onChange, min, max, step, suffix = '' }: {
  value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <Slider value={[value]} onValueChange={([v]) => onChange(v)} min={min} max={max} step={step} className="flex-1" />
      <span className="text-xs text-muted-foreground w-12 text-right shrink-0">{value}{suffix}</span>
    </div>
  );
}

function getDefaultProps(type: string) {
  const props: Record<string, unknown> = {
    text: { content: '', fontSize: 16, color: '#333333', align: 'left', bgColor: '#ffffff' },
    image: { src: '', alt: '', width: '100%', hyperlink: '' },
    button: { text: 'Clique aqui', url: '#', bgColor: '#1a8a8a', textColor: '#ffffff', align: 'center', borderRadius: 6 },
    divider: { height: 1, color: '#e0e0e0', margin: 16 },
    columns: { columns: 2, gap: 16 },
    spacer: { height: 16 },
    html: { code: '' },
  };
  return props[type] || {};
}
