import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'

import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Color } from '@tiptap/extension-color'
import { TextStyle } from '@tiptap/extension-text-style'
import { Highlight } from '@tiptap/extension-highlight'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { FontSize } from './extensions/FontSize'
import { 
  Bold, Italic, Strikethrough, 
  Heading1, Heading2, List, ListOrdered, Quote, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, 
  Image as ImageIcon, Undo, Redo, Type, Droplet, Highlighter, Eraser, Loader2 
} from 'lucide-react'
import { useCallback, useEffect, forwardRef, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, ChangeEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { handleImageUpload } from '@/lib/tiptap-utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  onImageUpload?: (file: File) => Promise<string>
}

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isActive?: boolean
  children: ReactNode
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(
  ({ isActive = false, className, type, ...props }, ref) => (
    <button
      ref={ref}
      type={type ?? "button"}
      className={cn(
        "p-2 rounded-md transition-colors hover:bg-muted",
        isActive ? "bg-muted text-primary" : "text-muted-foreground",
        className
      )}
      {...props}
    />
  )
)
ToolbarButton.displayName = "ToolbarButton"

export function RichTextEditor({ value, onChange, placeholder, className, onImageUpload }: RichTextEditorProps) {
  const { toast } = useToast()
  const imageUploadInputRef = useRef<HTMLInputElement>(null)
  const [imageUploading, setImageUploading] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      FontSize,
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-border p-2',
        },
      }),

      Image.configure({
        HTMLAttributes: {
          class: 'rounded-lg border border-border',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Comece a escrever...',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[150px] p-4 focus:outline-none',
      },
    },
  })

  // Sync value prop with editor content
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL:', previousUrl)
    
    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addImage = useCallback(() => {
    imageUploadInputRef.current?.click()
  }, [])

  const onImageFileSelected = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      e.target.value = ''
      if (!file || !editor) return

      setImageUploading(true)
      try {
        const url = onImageUpload ? await onImageUpload(file) : await handleImageUpload(file)
        editor.chain().focus().setImage({ src: url }).run()
      } catch (err: any) {
        toast({
          title: 'Erro',
          description: err?.message || 'Não foi possível enviar a imagem.',
          variant: 'destructive',
        })
      } finally {
        setImageUploading(false)
      }
    },
    [editor, toast]
  )

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border rounded-md bg-background", className)}>
      <style>{`
        .ProseMirror p { margin-bottom: 0.75rem; }
        .ProseMirror p:last-child { margin-bottom: 0; }
        .ProseMirror h1, .ProseMirror h2, .ProseMirror h3 { margin-top: 1.25rem; margin-bottom: 0.5rem; }
        .ProseMirror ul, .ProseMirror ol { margin-left: 1.5rem; margin-bottom: 0.75rem; }
        .ProseMirror blockquote { margin: 1rem 0; border-left: 3px solid hsl(var(--border)); padding-left: 1rem; }
      `}</style>
      <div className="flex flex-wrap items-center gap-1 border-b p-2 bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Negrito"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Itálico"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive('strike')}
          title="Rasurado"
        >
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Título 1"
        >
          <Heading1 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Título 2"
        >
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Lista de Marcadores"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Lista Numerada"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Citação"
        >
          <Quote className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Alinhar à Esquerda"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Centralizar"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Alinhar à Direita"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          isActive={editor.isActive({ textAlign: 'justify' })}
          title="Justificar"
        >
          <AlignJustify className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-border mx-1" />

        {/* Tamanho da fonte */}
        <div className="flex items-center gap-1">
          <Type className="w-4 h-4 text-muted-foreground" />
          <Select
            value={String(editor?.getAttributes('textStyle')?.fontSize || '')}
            onValueChange={(v) => {
              if (!editor) return
              if (!v || v === 'default') {
                editor.chain().focus().unsetFontSize().run()
              } else {
                editor.chain().focus().setFontSize(v).run()
              }
            }}
          >
            <SelectTrigger className="h-8 w-[96px] text-xs">
              <SelectValue placeholder="Tamanho" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Padrão</SelectItem>
              <SelectItem value="8px">8px</SelectItem>
              <SelectItem value="10px">10px</SelectItem>
              <SelectItem value="12px">12px</SelectItem>
              <SelectItem value="14px">14px</SelectItem>
              <SelectItem value="16px">16px</SelectItem>
              <SelectItem value="18px">18px</SelectItem>
              <SelectItem value="20px">20px</SelectItem>
              <SelectItem value="24px">24px</SelectItem>
              <SelectItem value="28px">28px</SelectItem>
              <SelectItem value="32px">32px</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarButton title="Cor do texto">
              <Droplet className="w-4 h-4" aria-label="Cor do texto" />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-7 gap-1">
                {['#000000','#333333','#666666','#999999','#FFFFFF','#1A8A8A','#0E7490','#14B8A6','#E11D48','#F59E0B','#10B981','#3B82F6','#7C3AED'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => editor?.chain().focus().setColor(c).run()}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(editor?.getAttributes('textStyle')?.color || '#000000')}
                  onChange={(e) => {
                    if (!editor) return
                    editor.chain().focus().setColor(e.target.value).run()
                  }}
                  aria-label="Cor do texto (seleção)"
                  className="w-9 h-9 p-0 border rounded"
                />
                <ToolbarButton onClick={() => editor?.chain().focus().unsetColor().run()} title="Remover cor">
                  <Eraser className="w-4 h-4" />
                </ToolbarButton>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <ToolbarButton title="Fundo (highlight)">
              <Highlighter className="w-4 h-4" aria-label="Fundo (highlight)" />
            </ToolbarButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-72">
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-7 gap-1">
                {['#FFFACD','#FEF08A','#FDE68A','#E9D5FF','#BFDBFE','#D1FAE5','#FBCFE8','#FCA5A5','#E5E7EB'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => editor?.chain().focus().setHighlight({ color: c }).run()}
                    className="w-6 h-6 rounded border"
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={String(editor?.getAttributes('highlight')?.color || '#FFFACD')}
                  onChange={(e) => {
                    if (!editor) return
                    editor.chain().focus().setHighlight({ color: e.target.value }).run()
                  }}
                  aria-label="Cor de fundo (seleção)"
                  className="w-9 h-9 p-0 border rounded"
                />
                <ToolbarButton onClick={() => editor?.chain().focus().unsetHighlight().run()} title="Remover fundo">
                  <Eraser className="w-4 h-4" />
                </ToolbarButton>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Imagem" disabled={imageUploading}>
          {imageUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <input
        ref={imageUploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onImageFileSelected}
      />
      <EditorContent editor={editor} />
    </div>
  )
}