import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { MyFormulaOrder } from "@/types"
import { fetchMyFormulaOrder } from "@/services/myFormulaApi"

function pad(num: string, size: number) {
  const s = String(num ?? "")
  if (s.length >= size) return s
  return "0".repeat(size - s.length) + s
}

function formatDatePt(iso?: string | null) {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("pt-PT")
}

export default function MyFormulaPurchaseReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<MyFormulaOrder | null>(null)

  const storageKey = useMemo(() => `mf_report_state_${id ?? ""}`, [id])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetchMyFormulaOrder(id)
        if (!mounted) return
        setOrder(res.data ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])

  const clientCode = useMemo(() => {
    if (!order) return ""
    const prefix = order.customer_id ? "C." : "O."
    const num = order.customer_id ? String(order.customer_id) : String(order.order_id)
    return prefix + pad(num, 7)
  }, [order])

  const planName = useMemo(() => {
    const p = order?.products?.[0]
    return p?.name ?? ""
  }, [order])

  const collect = () => {
    return {
      editables: Array.from(document.querySelectorAll('[data-mf-editable="true"]')).map((el) => (el as HTMLElement).innerHTML),
      dates: Array.from(document.querySelectorAll('input[data-mf-date="true"]')).map((el) => (el as HTMLInputElement).value),
      checks: Array.from(document.querySelectorAll('input[data-mf-check="true"]')).map((el) => (el as HTMLInputElement).checked),
    }
  }

  const restore = () => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const s = JSON.parse(raw)
      const eds = document.querySelectorAll('[data-mf-editable="true"]')
      eds.forEach((el, i) => {
        if (s.editables && s.editables[i] !== undefined) (el as HTMLElement).innerHTML = s.editables[i]
      })
      const dts = document.querySelectorAll('input[data-mf-date="true"]')
      dts.forEach((el, i) => {
        if (s.dates && s.dates[i] !== undefined) (el as HTMLInputElement).value = s.dates[i]
      })
      const chs = document.querySelectorAll('input[data-mf-check="true"]')
      chs.forEach((el, i) => {
        if (s.checks && s.checks[i] !== undefined) (el as HTMLInputElement).checked = s.checks[i]
      })
    } catch {
      //
    }
  }

  useEffect(() => {
    if (!loading) {
      requestAnimationFrame(() => restore())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, storageKey])

  const onSave = () => {
    localStorage.setItem(storageKey, JSON.stringify(collect()))
    const btn = document.getElementById("btn-save")
    if (btn) {
      const prev = btn.textContent
      btn.textContent = "Gravado"
      setTimeout(() => {
        btn.textContent = prev ?? "Gravar"
      }, 1200)
    }
  }

  const onBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate("/myformula/orders")
  }

  return (
    <div>
      <style>
        {`
          :root { --fg:#111827; --muted:#6b7280; --border:#e5e7eb; }
          * { box-sizing: border-box; }
          body { color: var(--fg); }
          .mf-page { padding: 24px; }
          .container { max-width: 980px; margin: 0 auto; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, Helvetica, sans-serif; }
          .header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
          .header h1 { margin: 0; font-size: 22px; }
          .header p { margin: 4px 0 0; color: var(--muted); }
          .meta, .section { border:1px solid var(--border); border-radius: 8px; padding:16px; margin-top:14px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
          .label { font-size: 12px; color: var(--muted); }
          .value { border-bottom:1px solid var(--border); min-height:26px; padding:3px 0; }
          h2 { font-size: 16px; margin: 0 0 8px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border:1px solid var(--border); padding:8px; font-size: 13px; vertical-align: top; }
          th { background:#f9fafb; text-align:left; }
          .subtle { color: var(--muted); }
          .supp-col { padding:10px; border-radius:8px; background:#f9fafb; }
          .supp-col--tarde { background:#f3f4f6; }
          .print-actions { margin-top: 16px; text-align: right; display:flex; gap:8px; justify-content:flex-end; }
          .btn { display:inline-block; padding:8px 12px; border:1px solid var(--border); border-radius:8px; text-decoration:none; color: var(--fg); background: #fff; cursor:pointer; }
          .btn:disabled { opacity: 0.6; cursor:not-allowed; }
          .no-print { margin-bottom: 12px; display:flex; justify-content:flex-start; gap:8px; }
          @media print { .no-print, .print-actions { display: none; } .mf-page { padding: 0; } .container { max-width: unset; } }
        `}
      </style>

      <div className="mf-page">
        <div className="container">
          <div className="no-print">
            <button className="btn" type="button" onClick={onBack}>
              Voltar
            </button>
          </div>

          <div className="header">
            <div>
              <h1>Departamento de Compras</h1>
              <p>Encomendas MyFórmula</p>
            </div>
          </div>

          <div className="meta">
            {loading ? (
              <div className="subtle">A carregar…</div>
            ) : order ? (
              <>
                <div className="grid-3" style={{ gridTemplateColumns: "0.8fr 1.4fr 0.8fr" }}>
                  <div>
                    <div className="label">Número do Pedido</div>
                    <div className="value">{order.order_id}</div>
                  </div>
                  <div>
                    <div className="label">Nome do Cliente</div>
                    <div className="value">{order.firstname} {order.lastname}</div>
                  </div>
                  <div>
                    <div className="label">CLIENTE N.º:</div>
                    <div className="value">{clientCode}</div>
                  </div>
                </div>

                <div className="grid-3" style={{ marginTop: 10 }}>
                  <div>
                    <div className="label">NÚMERO DO PLANO:</div>
                    <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
                  </div>
                  <div>
                    <div className="label">Número do Mês</div>
                    <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
                  </div>
                  <div>
                    <div className="label">DATA DO RELATÓRIO:</div>
                    <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
                  </div>
                </div>
              </>
            ) : (
              <div className="subtle">Pedido não encontrado.</div>
            )}
          </div>

          <div className="section">
            <h2>Plano</h2>
            <div className="grid-3" style={{ gridTemplateColumns: "2fr 0.8fr 0.8fr" }}>
              <div>
                <div className="label">PLANO:</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning>{planName}</div>
              </div>
              <div>
                <div className="label">N.º DE CÁPSULAS POR DIA:</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>
              <div>
                <div className="label">Cor Capas</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="label">PESO LÍQUIDO:</div>
              <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="label">Como tomar MyFórmula</div>
              <div className="value" style={{ height: 60 }} data-mf-editable="true" contentEditable suppressContentEditableWarning />
            </div>
          </div>

          <div className="section">
            <h2>Suplementos</h2>
            <div className="grid-3">
              {["Manhã", "Tarde", "Noite"].map((title) => (
                <div key={title} className={"supp-col " + (title === "Tarde" ? "supp-col--tarde" : "")}>
                  <strong>{title}</strong>
                  <div className="subtle" style={{ marginTop: 6 }}>—</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section">
            <h2>Verificações Finais para Checkout</h2>
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Detalhes</th>
                  <th style={{ width: 80, textAlign: "center" }}>OK</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { item: "Blisters e Toma", details: "Como tomar MyFórmula —" },
                  { item: "Etiquetas do cliente", details: "1/capa, interior" },
                  { item: "Etiqueta global", details: "1/embalagem, fundo da manga" },
                  { item: "Post-it Nome do Cliente", details: "1/embalagem, frente da manga" },
                  { item: "Registo por fotos", details: "por cada capa" },
                  { item: "Embalagem final", details: "Plastificação + Caixa Protetora" },
                ].map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.item}</td>
                    <td>{r.details}</td>
                    <td style={{ textAlign: "center" }}><input type="checkbox" data-mf-check="true" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section">
            <h2>Informações Adicionais</h2>
            <div className="grid-3">
              <div>
                <div className="label">Data de Nascimento</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>
              <div>
                <div className="label">NIF</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>
              <div>
                <div className="label">Método de Pagamento</div>
                <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning>{order?.payment_method ?? ""}</div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="label">Data de Pagamento</div>
              <div className="value" data-mf-editable="true" contentEditable suppressContentEditableWarning />
            </div>
          </div>

          <div className="section">
            <h2>Registo de Preparação e Envio</h2>
            <div>
              <div className="label">Data do Pedido</div>
              <div className="value">{formatDatePt(order?.date_added ?? null)}</div>
            </div>

            <div className="grid-2" style={{ marginTop: 10 }}>
              <div>
                <div className="label">Data da Preparação</div>
                <div className="value">
                  <input data-mf-date="true" type="date" style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }} />
                </div>
                <div className="label" style={{ marginTop: 8 }}>Assinatura do Responsável pela Preparação</div>
                <div className="value" style={{ height: 40 }} data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>

              <div>
                <div className="label">Data de Envio</div>
                <div className="value">
                  <input data-mf-date="true" type="date" style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }} />
                </div>
                <div className="label" style={{ marginTop: 8 }}>Assinatura do Responsável pelo Envio</div>
                <div className="value" style={{ height: 40 }} data-mf-editable="true" contentEditable suppressContentEditableWarning />
              </div>
            </div>
          </div>

          <div className="section">
            <h2>Produtos</h2>
            {loading ? (
              <div className="subtle">A carregar…</div>
            ) : order?.products?.length ? (
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Modelo</th>
                    <th style={{ width: 70 }}>Qtd</th>
                  </tr>
                </thead>
                <tbody>
                  {order.products.map((p) => (
                    <tr key={p.order_product_id}>
                      <td>{p.name}</td>
                      <td>{p.model}</td>
                      <td>{p.quantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="subtle">—</div>
            )}
          </div>

          <div className="print-actions">
            <button className="btn" id="btn-save" type="button" onClick={onSave} disabled={!order}>Gravar</button>
            <button className="btn" type="button" onClick={() => window.print()} disabled={!order}>Imprimir</button>
          </div>
        </div>
      </div>
    </div>
  )
}