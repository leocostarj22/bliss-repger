import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'

import { Image } from '@tiptap/extension-image'
import { TextAlign } from '@tiptap/extension-text-align'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import Highlight from '@tiptap/extension-highlight'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import { FontSize } from './extensions/FontSize'
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  Heading1, Heading2, List, ListOrdered, Quote, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Link as LinkIcon, 
  Image as ImageIcon, Undo, Redo, Type, Droplet, Eraser 
} from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'

function ColorPickerPopover({
  colors,
  currentColor,
  onSelect,
  onClear,
  title,
  icon,
}: {
  colors: string[]
  currentColor: string
  onSelect: (color: string) => void
  onClear: () => void
  title: string
  icon: React.ReactNode
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          className="flex items-center gap-0.5 p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground"
        >
          {icon}
          <span
            className="w-4 h-1.5 rounded-sm border border-border/60 block"
            style={{ backgroundColor: currentColor }}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2.5" align="start" sideOffset={4}>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSelect(c)}
              className="w-6 h-6 rounded border border-border/50 hover:scale-110 transition-transform focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-border">
          <input
            type="color"
            value={currentColor}
            onChange={(e) => onSelect(e.target.value)}
            className="w-7 h-7 p-0 border rounded cursor-pointer flex-shrink-0"
            title="Cor personalizada"
          />
          <span className="text-[11px] text-muted-foreground flex-1">Personalizar</span>
          <button
            type="button"
            onClick={onClear}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Remover cor"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const ToolbarButton = ({ 
  onClick, 
  isActive = false, 
  children,
  title
}: { 
  onClick: () => void
  isActive?: boolean
  children: React.ReactNode
  title?: string
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "p-2 rounded-md transition-colors hover:bg-muted",
      isActive ? "bg-muted text-primary" : "text-muted-foreground"
    )}
    title={title}
  >
    {children}
  </button>
)

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
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
    if (!editor) return
    const url = window.prompt('URL da imagem:')
    if (url) {
      editor.chain().focus().setImage({ src: url }).run()
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={cn("border rounded-md bg-background", className)}>
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
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          title="Sublinhado"
        >
          <UnderlineIcon className="w-4 h-4" />
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

        <ColorPickerPopover
          colors={['#000000','#333333','#666666','#999999','#FFFFFF','#1A8A8A','#0E7490','#14B8A6','#E11D48','#F59E0B','#10B981','#3B82F6','#7C3AED']}
          currentColor={String(editor?.getAttributes('textStyle')?.color || '#000000')}
          onSelect={(c) => editor?.chain().focus().setColor(c).run()}
          onClear={() => editor?.chain().focus().unsetColor().run()}
          title="Cor do texto"
          icon={<Droplet className="w-4 h-4" />}
        />

        <ColorPickerPopover
          colors={['#FFFACD','#FEF08A','#FDE68A','#E9D5FF','#BFDBFE','#D1FAE5','#FBCFE8','#FCA5A5','#E5E7EB']}
          currentColor={String(editor?.getAttributes('highlight')?.color || '#FFFACD')}
          onSelect={(c) => editor?.chain().focus().setHighlight({ color: c }).run()}
          onClear={() => editor?.chain().focus().unsetHighlight().run()}
          title="Cor de fundo do texto"
          icon={<Droplet className="w-4 h-4 text-yellow-500" />}
        />

        <div className="w-px h-6 bg-border mx-1" />

        <ToolbarButton onClick={setLink} isActive={editor.isActive('link')} title="Link">
          <LinkIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={addImage} title="Imagem">
          <ImageIcon className="w-4 h-4" />
        </ToolbarButton>

        <div className="flex-1" />

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}