import { useRef, useState, useEffect, useMemo } from 'react';
import type { TemplateBlock, BlockType } from '@/types/template';
import { DEFAULT_BLOCK_PROPS } from '@/types/template';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ImagePlus, Trash2, Sparkles } from 'lucide-react';
import { handleImageUpload } from '@/lib/tiptap-utils';
import { toast } from 'react-hot-toast';
import { fetchEmailMedia, deleteEmailMedia, type EmailMediaItem } from '@/services/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { v4Fallback } from '@/lib/id';

// Função para extrair thumbnail de vídeo
function getVideoThumbnailUrl(url: string): string | null {
  if (!url) return null;
  
  // YouTube
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
  }
  
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

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteFilename, setPendingDeleteFilename] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const set = (key: string, val: unknown) => onChange({ ...p, [key]: val });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (block.type !== 'video') return;

    const url = String(p.url ?? '').trim();
    if (!url) {
      setVideoThumbnail(null);
      setIsLoadingThumbnail(false);
      return;
    }

    const thumbnailUrl = getVideoThumbnailUrl(url);
    if (!thumbnailUrl) {
      setVideoThumbnail(null);
      setIsLoadingThumbnail(false);
      return;
    }

    const current = String(p.thumbnailUrl ?? '').trim();
    const text = String(p.thumbnailText ?? '').trim();

    setIsLoadingThumbnail(true);
    setVideoThumbnail(thumbnailUrl);

    const needsUpdate = current !== thumbnailUrl || !text;
    if (needsUpdate) {
      onChange({
        ...p,
        thumbnailUrl: thumbnailUrl,
        thumbnailText: text || 'Assista ao vídeo',
      });
    }

    setIsLoadingThumbnail(false);
  }, [block.type, onChange, p]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Enviando imagem...");

    try {
      const url = await handleImageUpload(file);
      set('src', url);
      toast.success("Imagem enviada com sucesso", { id: toastId });
    } catch {
      toast.error("Erro ao enviar imagem", { id: toastId });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  useEffect(() => {
    if (!mediaOpen) return;

    setMediaLoading(true);
    fetchEmailMedia()
      .then(r => setMediaItems(r.data))
      .catch(() => toast.error('Falha ao carregar imagens do servidor'))
      .finally(() => setMediaLoading(false));
  }, [mediaOpen]);

  const filteredMedia = useMemo(() => {
    const q = mediaSearch.trim().toLowerCase();
    if (!q) return mediaItems;
    return mediaItems.filter(m => m.filename.toLowerCase().includes(q));
  }, [mediaItems, mediaSearch]);

  const updateChild = (index: number, child?: TemplateBlock) => {
    if (!onUpdateBlock) return;
    const children = [...(block.children || [])] as (TemplateBlock | undefined)[];
    children[index] = child as any;
    onUpdateBlock({ ...block, children: children as TemplateBlock[] });
  };

  const createChildOfType = (index: number, type: BlockType) => {
    const newChild: TemplateBlock = { id: v4Fallback(), type, props: { ...DEFAULT_BLOCK_PROPS[type] } } as TemplateBlock;
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
          <DialogHeader>
            <DialogTitle>Biblioteca de imagens</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={mediaSearch}
              onChange={e => setMediaSearch(e.target.value)}
              placeholder="Pesquisar por nome do ficheiro..."
              className="text-sm"
            />

            {mediaLoading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : filteredMedia.length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma imagem encontrada.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[420px] overflow-auto pr-1">
                {filteredMedia.map(item => (
                  <div key={item.url} className="relative">
                    <button
                      type="button"
                      className="group w-full rounded-md border border-border bg-card hover:bg-accent/40 text-left overflow-hidden"
                      onClick={() => {
                        if (mediaColumnIndex !== null && onUpdateBlock) {
                          // Definir src numa imagem dentro das colunas
                          const child = block.children?.[mediaColumnIndex];
                          if (child && child.type === 'image') {
                            const newChild: TemplateBlock = { ...child, props: { ...(child.props || {}), src: item.url } } as TemplateBlock;
                            const children = [...(block.children || [])];
                            children[mediaColumnIndex] = newChild;
                            onUpdateBlock({ ...block, children });
                          }
                          setMediaColumnIndex(null);
                        } else {
                          set('src', item.url);
                        }
                        setMediaOpen(false);
                      }}
                      title={item.filename}
                    >
                      <div className="aspect-video bg-muted overflow-hidden">
                        <img
                          src={item.url}
                          alt={item.filename}
                          className="h-full w-full object-cover group-hover:scale-[1.01] transition-transform"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-2">
                        <div className="text-xs font-medium truncate">{item.filename}</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      className="absolute right-2 top-2 z-10 rounded-full bg-background/90 hover:bg-destructive hover:text-destructive-foreground p-1 shadow"
                      title="Eliminar imagem do servidor"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setPendingDeleteFilename(item.filename);
                        setDeleteOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Dica: imagens enviadas pelo utilizador ficam em crm-media e são servidas por /api/v1/email/media/view.
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/60 p-4"
          onClick={() => {
            setDeleteOpen(false);
            setPendingDeleteFilename(null);
          }}
        >
          <div className="glass-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-2">
              <div className="text-lg font-semibold">Eliminar imagem?</div>
              <div className="text-sm text-muted-foreground">Deseja eliminar esta imagem do servidor?</div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteOpen(false);
                  setPendingDeleteFilename(null);
                }}
                disabled={deleting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={async () => {
                  const filename = pendingDeleteFilename;
                  if (!filename) return;
                  setDeleting(true);
                  try {
                    await deleteEmailMedia(filename);
                    setMediaItems(prev => prev.filter(m => m.filename !== filename));
                    toast.success('Imagem eliminada');
                    setDeleteOpen(false);
                    setPendingDeleteFilename(null);
                  } catch {
                    toast.error('Falha ao eliminar imagem');
                  } finally {
                    setDeleting(false);
                  }
                }}
                disabled={deleting}
              >
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <RichTextEditor value={String(p.content || '')} onChange={(html) => set('content', html)} />
          </Field>
          <Field label="Espaçamento entre linhas">
            <div className="flex items-center gap-3">
              <Slider
                value={[Number((p as any).lineHeight ?? 1.5)]}
                onValueChange={([v]) => set('lineHeight', v)}
                min={1}
                max={2.4}
                step={0.1}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{String((p as any).lineHeight ?? 1.5)}</span>
            </div>
          </Field>
          <Field label="Cor do texto">
            <Input type="color" value={String(p.color)} onChange={e => set('color', e.target.value)} className="h-9 w-full" />
          </Field>
          <Field label="Cor de fundo">
            <Input type="color" value={String((p as any).bgColor || '#ffffff')} onChange={e => set('bgColor', e.target.value)} className="h-9 w-full" />
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
            <div className="mt-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => { setMediaColumnIndex(null); setMediaOpen(true); }}
              >
                Escolher do servidor
              </Button>
            </div>
          </Field>
          <Field label="Hyperlink (opcional)">
            <Input value={String(p.hyperlink || '')} onChange={e => set('hyperlink', e.target.value)} className="text-sm" placeholder="https://exemplo.com" />
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
            <Input 
              value={String(p.url)} 
              onChange={e => {
                const value = e.target.value;
                set('url', value);
              }} 
              className="text-sm" 
              placeholder="https://exemplo.com"
            />
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

          <div className="pt-4 border-t border-border mt-4 space-y-3">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Conteúdo das Colunas</h4>
            {Array.from({ length: Number(p.columns) }).map((_, i) => {
              const child = block.children?.[i] as TemplateBlock | undefined;
              return (
                <div key={i} className="rounded-lg border border-border p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium">Coluna {i + 1}</div>
                    {child && (
                      <Button variant="outline" size="sm" onClick={() => updateChild(i, undefined)}>Limpar</Button>
                    )}
                  </div>
                  <div className="mt-2 space-y-2">
                    {!child ? (
                      <Select onValueChange={(v) => createChildOfType(i, v as BlockType)}>
                        <SelectTrigger><SelectValue placeholder="Escolher tipo de bloco" /></SelectTrigger>
                        <SelectContent>
                          {(['text','image','button','divider','spacer'] as BlockType[]).map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : child.type === 'text' ? (
                      <RichTextEditor
                        value={String((child.props as any)?.content || '')}
                        onChange={(html) => updateChildProp(i, 'content', html)}
                        className="text-sm"
                      />
                    ) : child.type === 'image' ? (
                      <div className="space-y-2">
                        <Input
                          value={String((child.props as any)?.src || '')}
                          onChange={e => updateChildProp(i, 'src', e.target.value)}
                          className="text-sm"
                          placeholder="URL da imagem"
                        />
                        <Button variant="outline" size="sm" onClick={() => { setMediaColumnIndex(i); setMediaOpen(true); }}>Escolher do servidor</Button>
                      </div>
                    ) : child.type === 'button' ? (
                      <div className="space-y-2">
                        <Input
                          value={String((child.props as any)?.text || '')}
                          onChange={e => updateChildProp(i, 'text', e.target.value)}
                          className="text-sm"
                          placeholder="Texto do botão"
                        />
                        <Input
                          value={String((child.props as any)?.url || '')}
                          onChange={e => updateChildProp(i, 'url', e.target.value)}
                          className="text-sm"
                          placeholder="URL"
                        />
                      </div>
                    ) : child.type === 'divider' ? (
                      <div>
                        <Label className="text-xs">Espessura</Label>
                        <Slider value={[Number((child.props as any)?.height || 1)]} onValueChange={([v]) => updateChildProp(i, 'height', v)} min={1} max={8} step={1} />
                      </div>
                    ) : child.type === 'spacer' ? (
                      <div>
                        <Label className="text-xs">Altura</Label>
                        <Slider value={[Number((child.props as any)?.height || 16)]} onValueChange={([v]) => updateChildProp(i, 'height', v)} min={8} max={120} step={4} />
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">Edição rápida indisponível para "{child.type}" — utilize arrastar e largar.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {block.type === 'html' && (
        <Field label="Código HTML">
          <div className="space-y-3">
            <Textarea
              value={String(p.code)}
              onChange={e => set('code', e.target.value)}
              rows={12}
              className="font-mono text-xs resize-y"
              placeholder="Cole ou edite o HTML aqui..."
              spellCheck={false}
            />
            {String(p.code).trim() && (
              <div className="space-y-2">
                {onConvertHtml && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="w-full gap-1.5"
                    onClick={() => onConvertHtml(String(p.code))}
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Converter em blocos editáveis
                  </Button>
                )}
              <div className="rounded-md border border-border overflow-hidden bg-white">
                <div className="px-2 py-1 bg-muted text-[10px] font-medium text-muted-foreground border-b border-border">
                  Pré-visualização
                </div>
                <div
                  className="p-3 max-h-64 overflow-auto prose prose-sm"
                  dangerouslySetInnerHTML={{ __html: String(p.code) }}
                />
              </div>
            )}
          </div>
        </Field>
      )}
      {block.type === 'video' && (
        <>
          <Field label="URL do vídeo">
            <Input 
              value={String(p.url)} 
              onChange={e => set('url', e.target.value)} 
              className="text-sm" 
              placeholder="https://youtube.com/watch?v=... ou https://vimeo.com/..."
            />
          </Field>
          
          {/* Preview da thumbnail */}
          {(() => {
            const thumbnailSrc = videoThumbnail || String((p as any).thumbnailUrl ?? '').trim();
            if (!thumbnailSrc) return null;

            return (
              <Field label="Thumbnail do vídeo">
                <div className="space-y-2">
                  <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={thumbnailSrc}
                      alt="Thumbnail do vídeo"
                      className="w-full h-full object-cover"
                      onError={() => {
                        setVideoThumbnail(null);
                      }}
                    />
                    {isLoadingThumbnail && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                        <span className="text-white text-sm">Carregando...</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Thumbnail extraída automaticamente do vídeo</p>
                </div>
              </Field>
            );
          })()}
          
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
            <div className="space-y-3">
              {['facebook','instagram','twitter','linkedin','youtube','tiktok'].map(net => {
                const active = ((p.networks as string[]) || []).includes(net);
                return (
                  <div key={net} className="space-y-1">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          const cur = (p.networks as string[]) || [];
                          set('networks', active ? cur.filter(n => n !== net) : [...cur, net]);
                        }}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="capitalize">{net}</span>
                    </label>
                    {active && (
                      <Input
                        value={(p.links as Record<string, string>)?.[net] || ''}
                        onChange={(e) => {
                          const links = (p.links as Record<string, string>) || {};
                          set('links', { ...links, [net]: e.target.value });
                        }}
                        placeholder={`URL do ${net}`}
                        className="h-7 text-xs"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Field>
          <Field label="Cor dos ícones">
            <Input 
              type="color" 
              value={String(p.color || '#333333')} 
              onChange={e => set('color', e.target.value)} 
              className="h-9 w-full" 
            />
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
