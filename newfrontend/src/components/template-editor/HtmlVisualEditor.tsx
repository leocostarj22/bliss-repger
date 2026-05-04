import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pencil, Image, Link, Code, Eye, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface HtmlVisualEditorProps {
  html: string;
  onChange: (newHtml: string) => void;
}

export function HtmlVisualEditor({ html, onChange }: HtmlVisualEditorProps) {
  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [codeValue, setCodeValue] = useState(html);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editType, setEditType] = useState<'text' | 'image' | 'link'>('text');
  const [editValue, setEditValue] = useState('');
  const [editHref, setEditHref] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (mode === 'code') setCodeValue(html);
  }, [html, mode]);

  const buildEditingHtml = useCallback((sourceHtml: string) => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { cursor: pointer !important; }
          body { margin: 0; padding: 0; }
          [data-editable]:hover {
            outline: 2px dashed #3b82f6 !important;
            outline-offset: 2px;
            position: relative;
          }
          [data-editable]:hover::after {
            content: '✏️';
            position: absolute;
            top: -24px;
            left: 4px;
            font-size: 12px;
            background: #3b82f6;
            color: white;
            padding: 2px 6px;
            border-radius: 4px;
            z-index: 9999;
            pointer-events: none;
          }
          [data-selected="true"] {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px;
          }
          img[data-editable]:hover {
            outline: 2px dashed #f59e0b !important;
          }
          img[data-editable]:hover::after {
            content: '🖼️';
          }
          a[data-editable]:hover {
            outline: 2px dashed #10b981 !important;
          }
          a[data-editable]:hover::after {
            content: '🔗';
          }
        </style>
      </head>
      <body>
        ${sourceHtml}
        <script>
          const textElements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, span, td, th, div, li, blockquote, pre');
          textElements.forEach(el => {
            if (el.textContent.trim().length > 0 && !el.querySelector('img')) {
              el.setAttribute('data-editable', 'text');
            }
          });
          document.querySelectorAll('img[src]').forEach(img => {
            if (img.getAttribute('src') && img.getAttribute('src') !== '#' && img.getAttribute('src').trim() !== '') {
              img.setAttribute('data-editable', 'image');
            }
          });
          document.querySelectorAll('a[href]').forEach(a => {
            if (a.getAttribute('href') && a.getAttribute('href') !== '#') {
              a.setAttribute('data-editable', 'link');
            }
          });
          document.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            let target = e.target;
            while (target && target !== document.body) {
              if (target.getAttribute && target.getAttribute('data-editable')) {
                break;
              }
              target = target.parentElement;
            }
            if (!target || target === document.body) {
              document.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));
              window.parent.postMessage({ type: 'deselect' }, '*');
              return;
            }
            document.querySelectorAll('[data-selected]').forEach(el => el.removeAttribute('data-selected'));
            target.setAttribute('data-selected', 'true');
            const editType = target.getAttribute('data-editable');
            let message = { type: 'element-selected', editType: editType, tagName: target.tagName.toLowerCase() };
            if (editType === 'text') {
              message.content = target.innerHTML;
              message.textContent = target.textContent;
            } else if (editType === 'image') {
              message.src = target.getAttribute('src');
              message.alt = target.getAttribute('alt') || '';
            } else if (editType === 'link') {
              message.href = target.getAttribute('href');
              message.textContent = target.textContent;
            }
            window.parent.postMessage(message, '*');
          }, true);
        </script>
      </body>
      </html>
    `;
  }, []);

  useEffect(() => {
    if (mode !== 'visual' || !iframeRef.current) return;
    const iframe = iframeRef.current;
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(buildEditingHtml(html));
    doc.close();
  }, [html, mode, buildEditingHtml]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'element-selected') {
        const data = e.data;
        setEditType(data.editType);
        if (data.editType === 'text') {
          setEditValue(data.content || '');
        } else if (data.editType === 'image') {
          setEditValue(data.src || '');
          setEditHref(data.alt || '');
        } else if (data.editType === 'link') {
          setEditValue(data.href || '');
          setEditHref(data.textContent || '');
        }
        setEditDialogOpen(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const applyEdit = () => {
    if (!iframeRef.current) return;
    const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
    if (!doc) return;
    const selected = doc.querySelector('[data-selected="true"]');
    if (!selected) return;
    if (editType === 'text') {
      selected.innerHTML = editValue;
    } else if (editType === 'image') {
      selected.setAttribute('src', editValue);
      if (editHref) selected.setAttribute('alt', editHref);
    } else if (editType === 'link') {
      selected.setAttribute('href', editValue);
    }
    const bodyHtml = doc.body.innerHTML;
    const cleanHtml = bodyHtml
      .replace(/<script>[\s\S]*?<\/script>/g, '')
      .replace(/\sdata-editable="[^"]*"/g, '')
      .replace(/\sdata-selected="[^"]*"/g, '');
    onChange(cleanHtml);
    setEditDialogOpen(false);
    toast.success('Elemento atualizado');
  };

  const handleCodeApply = () => {
    onChange(codeValue);
    setMode('visual');
    toast.success('Código atualizado');
  };

  return (
    <div className="space-y-2">
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'visual' | 'code')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="visual"><Eye className="w-3.5 h-3.5 mr-1.5" /> Visual</TabsTrigger>
          <TabsTrigger value="code"><Code className="w-3.5 h-3.5 mr-1.5" /> Código</TabsTrigger>
        </TabsList>
      </Tabs>
      {mode === 'visual' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Pencil className="w-3 h-3" />
            <span>Clique em qualquer texto, imagem ou link para editar</span>
          </div>
          <div className="rounded-md border border-border overflow-hidden bg-white">
            <iframe
              ref={iframeRef}
              className="w-full border-0"
              style={{ minHeight: '400px', maxHeight: '600px' }}
              sandbox="allow-same-origin"
              title="HTML Editor Preview"
            />
          </div>
        </div>
      )}
      {mode === 'code' && (
        <div className="space-y-2">
          <textarea
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value)}
            className="w-full font-mono text-xs p-3 rounded-md border border-border bg-background resize-y min-h-[400px] max-h-[600px]"
            placeholder="Cole ou edite o HTML aqui..."
            spellCheck={false}
          />
          <Button type="button" size="sm" className="w-full gap-1.5" onClick={handleCodeApply}>
            <RefreshCw className="w-3.5 h-3.5" /> Aplicar alterações
          </Button>
        </div>
      )}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editType === 'text' && <><Pencil className="w-4 h-4" /> Editar Texto</>}
              {editType === 'image' && <><Image className="w-4 h-4" /> Editar Imagem</>}
              {editType === 'link' && <><Link className="w-4 h-4" /> Editar Link</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editType === 'text' && (
              <div className="space-y-2">
                <Label>Conteúdo HTML</Label>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full font-mono text-xs p-3 rounded-md border border-border bg-background resize-y min-h-[200px]"
                  spellCheck={false}
                />
              </div>
            )}
            {editType === 'image' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>URL da Imagem</Label>
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="https://..." />
                </div>
                {editValue && (
                  <div className="rounded-md overflow-hidden border border-border bg-muted aspect-video">
                    <img src={editValue} alt="Preview" className="w-full h-full object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Texto Alternativo</Label>
                  <Input value={editHref} onChange={(e) => setEditHref(e.target.value)} placeholder="Descrição da imagem" />
                </div>
              </div>
            )}
            {editType === 'link' && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>URL do Link</Label>
                  <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Texto do Link</Label>
                  <Input value={editHref} onChange={(e) => setEditHref(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={applyEdit}>Aplicar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
