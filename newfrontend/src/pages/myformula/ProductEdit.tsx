import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ChevronLeft } from "lucide-react"

import type { MyFormulaProduct } from "@/types"
import { fetchMyFormulaProducts, updateMyFormulaProduct } from "@/services/myFormulaApi"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { useToast } from "@/components/ui/use-toast"

export default function ProductEdit() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const params = useParams()
  const productId = params.id || params.product_id || ""

  const [row, setRow] = useState<MyFormulaProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [model, setModel] = useState("")
  const [name, setName] = useState("")
  const decodeHtml = (input: string) => {
    if (typeof window === "undefined") return input
    const txt = document.createElement("textarea")
    txt.innerHTML = input
    return txt.value
  }
  const hasHtml = (input: string) => /<[^>]+>/.test(input)
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual")
  const decodedHtml = useMemo(() => decodeHtml(description), [description])

  const load = async () => {
    setLoading(true)
    try {
      const resp = await fetchMyFormulaProducts({ search: "", status: "all" })
      const found = resp.data.find((p) => String(p.product_id) === String(productId)) || null
      setRow(found || null)
      if (found) {
        setModel(found.model ?? "")
        setName(found.description?.name ?? "")
        const initialDesc = decodeHtml(found.description?.description ?? "")
        setDescription(initialDesc)
        setPrice(found.price != null ? String(found.price) : "")
        setQuantity(found.quantity != null ? String(found.quantity) : "")
        setIsActive(Boolean(found.status ?? true))
        setEditorMode(hasHtml(found.description?.description ?? "") ? "visual" : "html")
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível carregar o produto", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId])

  const back = () => {
    if (window.history.length > 1) window.history.back()
    else navigate("/myformula/products")
  }

  const submit = async () => {
    if (!row) return
    if (!model.trim()) {
      toast({ title: "Erro", description: "Modelo é obrigatório", variant: "destructive" })
      return
    }
    if (!name.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" })
      return
    }

    setSaving(true)
    try {
      const nPrice = price.trim() ? Number(price) : null
      const nQty = quantity.trim() ? Number(quantity) : null

      await updateMyFormulaProduct(row.product_id, {
        model,
        name,
        description: description.trim() ? description : null,
        price: nPrice,
        quantity: nQty,
        status: isActive,
      })
      toast({ title: "Sucesso", description: "Produto atualizado" })
      back()
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível guardar", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">Editar produto</h1>
            <p className="page-subtitle">Atualize os dados do catálogo MyFormula</p>
            <div className="mt-3 h-1 w-24 rounded-full bg-gradient-to-r from-cyan-400 to-fuchsia-500" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={back}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={submit} disabled={saving || loading || !row}>
              {saving ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : !row ? (
          <div className="text-muted-foreground">Produto não encontrado.</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Modelo</div>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: MF-001" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Nome</div>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome público" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Preço (€)</div>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>

            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Quantidade</div>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-xs text-muted-foreground">Descrição</div>
                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as any)}>
                  <TabsList>
                    <TabsTrigger value="visual">Editor</TabsTrigger>
                    <TabsTrigger value="html">HTML</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {editorMode === "visual" ? (
                <RichTextEditor value={description} onChange={setDescription} placeholder="Descrição do produto..." />
              ) : (
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição do produto..." className="min-h-[220px] font-mono text-xs" />
              )}

              <div className="mt-3 p-3 rounded-md border bg-background">
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: decodedHtml }} />
              </div>
            </div>

            <div className="flex items-center justify-between md:col-span-2">
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Ativo</div>
                <div className="text-sm">{isActive ? "Sim" : "Não"}</div>
              </div>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}