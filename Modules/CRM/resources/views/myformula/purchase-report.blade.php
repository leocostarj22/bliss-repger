<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de Compras | Encomendas MyFórmula</title>
<style>
  :root { --fg:#111827; --muted:#6b7280; --border:#e5e7eb; }
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, Noto Sans, Helvetica, sans-serif; color: var(--fg); margin: 0; padding: 24px; }
  .container { max-width: 980px; margin: 0 auto; }
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
  .checks { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .check-item { display:flex; align-items:center; gap: 8px; }
  .box { display:inline-block; width:16px; height:16px; border:1px solid var(--fg); }
  .subtle { color: var(--muted); }
  .totals { display:flex; gap:12px; margin-top:8px; }
  .total-pill { border:1px solid var(--border); padding:6px 10px; border-radius:6px; font-size:12px; }
  .print-actions { margin-top: 16px; text-align: right; }
  .btn { display:inline-block; padding:8px 12px; border:1px solid var(--border); border-radius:8px; text-decoration:none; color: var(--fg); }
  @media print { .print-actions { display: none; } body { padding: 0; } .container { max-width: unset; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>Departamento de Compras</h1>
    <p>Encomendas MyFórmula</p>
  </div>

  <div class="meta">
    <div class="grid-3">
      <div>
        <div class="label">Número do Pedido</div>
        <div class="value">{{ $order->order_id }}</div>
      </div>
      <div>
        <div class="label">Nome do Cliente</div>
        <div class="value">{{ $order->firstname }} {{ $order->lastname }}</div>
      </div>
      <div>
        <div class="label">Número do Cliente</div>
        <div class="value">{{ $order->customer_id }}</div>
      </div>
    </div>
    <div class="grid-3" style="margin-top:10px">
      <div>
        <div class="label">Número do Plano</div>
        <div class="value" contenteditable="true">{{ $reportData['plan_number'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">Número do Mês</div>
        <div class="value" contenteditable="true">{{ $reportData['month_number'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">Data do Relatório</div>
        <div class="value">{{ now()->format('d/m/Y H:i') }}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Plano</h2>
    <div class="grid-3">
      <div>
        <div class="label">Nome do plano</div>
        <div class="value" contenteditable="true">{{ $reportData['plan_name'] ?? '' }}</div>
      </div
      ><div>
        <div class="label">Toma diária (cápsulas)</div>
        <div class="value" contenteditable="true">{{ $reportData['capsules'] ?? '' }}</div>
      </div
      ><div>
        <div class="label">Cor Capas</div>
        <div class="value" contenteditable="true"></div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div class="label">Peso Líquido</div>
      <div class="value">{{ $reportData['net_weight'] ?? '' }}</div>
    </div>
    <div style="margin-top:10px">
      <div class="label">Como tomar MyFórmula</div>
      <div class="value" style="height:60px" contenteditable="true">{{ $reportData['how_to_take'] ?? '' }}</div>
    </div>
  </div>

  <div class="section">
    <h2>Suplementos</h2>
    <div>
      <h3 class="subtle" style="margin:8px 0 6px">Suplementos (por período)</h3>
      @foreach (($reportData['supplements_by_period'] ?? []) as $group)
        @if (!empty($group['items']))
          <div style="margin-top:6px">
            <strong>{{ $group['title'] }}</strong>
            <ul style="margin:6px 0 0 18px; padding:0;">
              @foreach ($group['items'] as $item)
                <li>{{ $item['name'] }}</li>
              @endforeach
            </ul>
          </div>
        @endif
      @endforeach
    </div>

  </div>

  <div class="section">
    <h2>Verificações Finais para Checkout</h2>
    <div class="grid-2">
      <div class="checks">
        <label class="check-item"><input type="checkbox" class="check" /> Blisters e Toma</label>
        <label class="check-item"><input type="checkbox" class="check" /> Etiquetas do cliente (1/capa, interior)</label>
        <label class="check-item"><input type="checkbox" class="check" /> Etiqueta global (1/embalagem, fundo da manga)</label>
        <label class="check-item"><input type="checkbox" class="check" /> Post-it Nome do Cliente (1/embalagem, frente da manga)</label>
        <label class="check-item"><input type="checkbox" class="check" /> Registo por fotos (por cada capa)</label>
        <label class="check-item"><input type="checkbox" class="check" /> Embalagem final (Plastificação + Caixa Protetora)</label>
      </div>
      <div>
        <div class="grid-2">
          <div>
            <div class="label">Data do Pedido</div>
            <div class="value">{{ optional($order->date_added)->format('d/m/Y H:i') }}</div>
          </div>
          <div>
            <div class="label">Data da Preparação</div>
            <div class="value" contenteditable="true"></div>
          </div>
        </div>
        <div class="grid-2" style="margin-top:10px">
          <div>
            <div class="label">Responsável</div>
            <div class="value" contenteditable="true"></div>
          </div>
          <div>
            <div class="label">Data de Envio / Responsável</div>
            <div class="value" contenteditable="true"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Informações Adicionais</h2>
    <div class="grid-3">
      <div>
        <div class="label">Data de Nascimento</div>
        <div class="value" contenteditable="true">{{ $reportData['birthdate'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">NIF</div>
        <div class="value" contenteditable="true">{{ $reportData['nif'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">Método de Pagamento</div>
        <div class="value" contenteditable="true">{{ $order->payment_method }}</div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div class="label">Data de Pagamento</div>
      <div class="value" contenteditable="true">{{ $reportData['payment_date'] ?? '' }}</div>
    </div>
  </div>

  <div class="print-actions">
    <a href="#" class="btn" onclick="window.print()">Imprimir</a>
  </div>
</div>
</body>
</html>