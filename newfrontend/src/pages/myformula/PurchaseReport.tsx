import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"

import type { MyFormulaOrder } from "@/types"
import { fetchMyFormulaPurchaseReport, type MyFormulaPurchaseReportData } from "@/services/myFormulaApi"

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

type ReportStateV2 = {
  v: 2
  editables: Record<string, string>
  dates: Record<string, string>
  checks: Record<string, boolean>
  selects: Record<string, string>
}

export default function MyFormulaPurchaseReport() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState<MyFormulaOrder | null>(null)
  const [reportData, setReportData] = useState<MyFormulaPurchaseReportData | null>(null)

  const storageKey = useMemo(() => `mf_report_state_${id ?? ""}`, [id])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!id) return
      setLoading(true)
      try {
        const res = await fetchMyFormulaPurchaseReport(id)
        if (!mounted) return
        setOrder(res.data?.order ?? null)
        setReportData(res.data?.reportData ?? null)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [id])

  const collect = (): ReportStateV2 => {
    const editables: Record<string, string> = {}
    const dates: Record<string, string> = {}
    const checks: Record<string, boolean> = {}
    const selects: Record<string, string> = {}

    document.querySelectorAll('[data-mf-editable="true"][data-mf-key]').forEach((el) => {
      const key = (el as HTMLElement).getAttribute("data-mf-key")
      if (!key) return
      editables[key] = (el as HTMLElement).innerHTML
    })

    document.querySelectorAll('input[data-mf-date="true"][data-mf-key]').forEach((el) => {
      const key = (el as HTMLInputElement).getAttribute("data-mf-key")
      if (!key) return
      dates[key] = (el as HTMLInputElement).value
    })

    document.querySelectorAll('input[data-mf-check="true"][data-mf-key]').forEach((el) => {
      const key = (el as HTMLInputElement).getAttribute("data-mf-key")
      if (!key) return
      checks[key] = (el as HTMLInputElement).checked
    })

    document.querySelectorAll('select[data-mf-select="true"][data-mf-key]').forEach((el) => {
      const key = (el as HTMLSelectElement).getAttribute("data-mf-key")
      if (!key) return
      selects[key] = (el as HTMLSelectElement).value
    })

    return { v: 2, editables, dates, checks, selects }
  }

  const restore = () => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const s = JSON.parse(raw) as Partial<ReportStateV2>
      if (s.v !== 2) return

      document.querySelectorAll('[data-mf-editable="true"][data-mf-key]').forEach((el) => {
        const key = (el as HTMLElement).getAttribute("data-mf-key")
        if (!key) return
        const next = s.editables?.[key]
        if (next !== undefined) (el as HTMLElement).innerHTML = next
      })

      document.querySelectorAll('input[data-mf-date="true"][data-mf-key]').forEach((el) => {
        const key = (el as HTMLInputElement).getAttribute("data-mf-key")
        if (!key) return
        const next = s.dates?.[key]
        if (next !== undefined) (el as HTMLInputElement).value = next
      })

      document.querySelectorAll('input[data-mf-check="true"][data-mf-key]').forEach((el) => {
        const key = (el as HTMLInputElement).getAttribute("data-mf-key")
        if (!key) return
        const next = s.checks?.[key]
        if (next !== undefined) (el as HTMLInputElement).checked = next
      })

      document.querySelectorAll('select[data-mf-select="true"][data-mf-key]').forEach((el) => {
        const key = (el as HTMLSelectElement).getAttribute("data-mf-key")
        if (!key) return
        const next = s.selects?.[key]
        if (next !== undefined) (el as HTMLSelectElement).value = next
      })
    } catch {
      return
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
          .header-logo { display:flex; align-items:flex-start; justify-content:flex-end; }
          .header-logo img { max-height: 44px; width:auto; object-fit: contain; }
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
          .supp-col { padding:10px 10px 10px 0; border-radius:8px; background:#f9fafb; }
          .supp-col--tarde { background:#f3f4f6; }
          .print-actions { margin-top: 16px; text-align: right; display:flex; gap:8px; justify-content:flex-end; }
          .btn { display:inline-block; padding:8px 12px; border:1px solid var(--border); border-radius:8px; text-decoration:none; color: var(--fg); background: #fff; cursor:pointer; }
          .btn:disabled { opacity: 0.6; cursor:not-allowed; }
          .no-print { margin-bottom: 12px; display:flex; justify-content:flex-start; gap:8px; }
          @media print {
            .no-print, .print-actions { display: none; }
            .mf-page { padding: 0; }
            .container { max-width: unset; }
            body, .container { font-size: 12px; }
            .header h1 { font-size: 18px; }
            .header p { font-size: 12px; }
            h2 { font-size: 14px; }
            th, td { font-size: 12px; }
            .label { font-size: 11px; }
          }
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
              <h1>Guia de Manipulação</h1>
              <p>Departamento de Expedição</p>
            </div>
            <div className="header-logo">
              <img src="/images/myformula-logo.png" alt="MyFórmula" />
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
                    <div className="value">{reportData?.client_code ?? ((order.customer_id ? "C." : "O.") + pad(order.customer_id ? String(order.customer_id) : String(order.order_id), 7))}</div>
                  </div>
                </div>

                <div className="grid-3" style={{ marginTop: 10 }}>
                  <div>
                    <div className="label">NÚMERO DO PLANO:</div>
                    <div
                      className="value"
                      data-mf-editable="true"
                      data-mf-key="plan_number"
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: reportData?.plan_number ?? "" }}
                    />
                  </div>
                  <div>
                    <div className="label">Número do Mês</div>
                    <div
                      className="value"
                      data-mf-editable="true"
                      data-mf-key="month_number"
                      contentEditable
                      suppressContentEditableWarning
                      dangerouslySetInnerHTML={{ __html: reportData?.month_number ?? "" }}
                    />
                  </div>
                  <div>
                    <div className="label">DATA DO RELATÓRIO:</div>
                    <div className="value">{reportData?.report_date ?? ""}</div>
                  </div>
                </div>

                <div className="grid-3" style={{ marginTop: 10 }}>
                  <div>
                    <div className="label">CRM</div>
                    <div className="value" data-mf-editable="true" data-mf-key="crm" contentEditable suppressContentEditableWarning />
                  </div>
                  <div>
                    <div className="label">Número de Referência</div>
                    <div className="value" data-mf-editable="true" data-mf-key="reference_number" contentEditable suppressContentEditableWarning />
                  </div>
                  <div>
                    <div className="label">Courier (Serviço de entrega)</div>
                    <div className="value">
                      <select data-mf-select="true" data-mf-key="courier" defaultValue="CTT" style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}>
                        <option value="CTT">CTT</option>
                        <option value="VASP">VASP</option>
                      </select>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="subtle">Pedido não encontrado.</div>
            )}
          </div>

          <div className="section">
            <h2>Plano</h2>
            <div>
              <div className="label">PLANO:</div>
              <div
                className="value"
                data-mf-editable="true"
                data-mf-key="plan_name"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: reportData?.plan_name ?? "" }}
              />
            </div>

            <div className="grid-3" style={{ marginTop: 10, gridTemplateColumns: "1.2fr 0.8fr 0.8fr" }}>
              <div>
                <div className="label">N.º DE CÁPSULAS POR DIA:</div>
                <div
                  className="value"
                  data-mf-editable="true"
                  data-mf-key="capsules"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportData?.capsules ?? "" }}
                />
              </div>
              <div>
                <div className="label">PESO LÍQUIDO:</div>
                <div
                  className="value"
                  data-mf-editable="true"
                  data-mf-key="net_weight"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportData?.net_weight ?? "" }}
                />
              </div>
              <div>
                <div className="label">Tipo de Saída</div>
                <div className="value">
                  <select
                    data-mf-select="true"
                    data-mf-key="tipo_saida"
                    defaultValue={reportData?.tipo_saida ?? ""}
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  >
                    <option value=""></option>
                    <option value="MF - Pré paga">MF - Pré paga</option>
                    <option value="MF - Paga / Pendente">MF - Paga / Pendente</option>
                    <option value="CC - Pré paga">CC - Pré paga</option>
                    <option value="CC - À cobrança">CC - À cobrança</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="label">Como tomar MyFórmula {reportData?.plan_letters ?? ""}</div>
              <div
                className="value"
                style={{ height: 60 }}
                data-mf-editable="true"
                data-mf-key="how_to_take"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: reportData?.how_to_take ?? "" }}
              />
            </div>
          </div>

          <div className="section">
            <h2>Suplementos</h2>
            <div className="grid-3">
              {(reportData?.supplements_by_period?.length
                ? reportData.supplements_by_period
                : [
                    { title: "Manhã", items: [] },
                    { title: "Tarde", items: [] },
                    { title: "Noite", items: [] },
                  ]
              ).map((group) => (
                <div key={group.title} className={"supp-col " + (group.title === "Tarde" ? "supp-col--tarde" : "")}>
                  <strong>{group.title}</strong>
                  {group.items?.length ? (
                    <ul style={{ margin: "6px 0 0 0", padding: 0 }}>
                      {group.items.map((item, idx) => (
                        <li key={item.slug ?? `${item.name}-${idx}`}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                            <span>{item.letter ? `${item.letter} - ` : ""}{item.name}</span>
                            <input
                              type="checkbox"
                              data-mf-check="true"
                              data-mf-key={`supp:${group.title}:${item.slug ?? item.name}:${idx}`}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="subtle" style={{ marginTop: 6 }}>—</div>
                  )}
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
                  {
                    item: "Blisters e Toma",
                    details: `Como tomar MyFórmula ${reportData?.plan_letters ?? ""} — ${reportData?.how_to_take ?? ""}`,
                  },
                  { item: "Etiquetas do cliente", details: "1/capa, interior" },
                  { item: "Etiqueta global", details: "1/embalagem, fundo da manga" },
                  { item: "Post-it Nome do Cliente", details: "1/embalagem, frente da manga" },
                  { item: "Registo por fotos", details: "por cada capa" },
                  { item: "Embalagem final", details: "Plastificação + Caixa Protetora" },
                ].map((r, idx) => (
                  <tr key={idx}>
                    <td>{r.item}</td>
                    <td>{r.details}</td>
                    <td style={{ textAlign: "center" }}>
                      <input type="checkbox" data-mf-check="true" data-mf-key={`checkout:${idx}`} />
                    </td>
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
                <div
                  className="value"
                  data-mf-editable="true"
                  data-mf-key="birthdate"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportData?.birthdate ?? "" }}
                />
              </div>
              <div>
                <div className="label">NIF</div>
                <div
                  className="value"
                  data-mf-editable="true"
                  data-mf-key="nif"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportData?.nif ?? "" }}
                />
              </div>
              <div>
                <div className="label">Método de Pagamento</div>
                <div
                  className="value"
                  data-mf-editable="true"
                  data-mf-key="payment_method"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: reportData?.payment_method ?? order?.payment_method ?? "" }}
                />
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <div className="label">Data de Pagamento</div>
              <div
                className="value"
                data-mf-editable="true"
                data-mf-key="payment_date"
                contentEditable
                suppressContentEditableWarning
                dangerouslySetInnerHTML={{ __html: reportData?.payment_date ?? "" }}
              />
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
                  <input
                    data-mf-date="true"
                    data-mf-key="prep_date"
                    type="date"
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  />
                </div>
                <div className="label" style={{ marginTop: 8 }}>Assinatura do Responsável pela Preparação</div>
                <div className="value" style={{ height: 40 }} data-mf-editable="true" data-mf-key="prep_signature" contentEditable suppressContentEditableWarning />
              </div>

              <div>
                <div className="label">Data de Envio</div>
                <div className="value">
                  <input
                    data-mf-date="true"
                    data-mf-key="shipping_date"
                    type="date"
                    style={{ border: 0, width: "100%", padding: 0, font: "inherit", background: "transparent" }}
                  />
                </div>
                <div className="label" style={{ marginTop: 8 }}>Assinatura do Responsável pelo Envio</div>
                <div className="value" style={{ height: 40 }} data-mf-editable="true" data-mf-key="shipping_signature" contentEditable suppressContentEditableWarning />
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