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
  .checks { display:grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .check-item { display:flex; align-items:center; gap: 8px; }
  .box { display:inline-block; width:16px; height:16px; border:1px solid var(--fg); }
  .subtle { color: var(--muted); }
  .totals { display:flex; gap:12px; margin-top:8px; }
  .total-pill { border:1px solid var(--border); padding:6px 10px; border-radius:6px; font-size:12px; }
  .supp-col { padding:10px; border-radius:8px; background:#f9fafb; }
  .supp-col--tarde { background:#f3f4f6; }
  .print-actions { margin-top: 16px; text-align: right; }
  .btn { display:inline-block; padding:8px 12px; border:1px solid var(--border); border-radius:8px; text-decoration:none; color: var(--fg); }
  @media print { .print-actions { display: none; } body { padding: 0; } .container { max-width: unset; } }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <h1>Departamento de Compras</h1>
      <p>Encomendas MyFórmula</p>
    </div>
    <div class="header-logo">
      @php($myformulaLogoPath = public_path('images/myformula-logo.png'))
      @if (is_file($myformulaLogoPath))
        <img src="{{ asset('images/myformula-logo.png') }}" alt="MyFórmula" />
      @endif
    </div>
  </div>

  <div class="meta">
    <div class="grid-3" style="grid-template-columns: 0.8fr 1.4fr 0.8fr;">
      <div>
        <div class="label">Número do Pedido</div>
        <div class="value">{{ $order->order_id }}</div>
      </div>
      <div>
        <div class="label">Nome do Cliente</div>
        <div class="value">{{ $order->firstname }} {{ $order->lastname }}</div>
      </div>
      <div>
        <div class="label">CLIENTE N.º:</div>
        <div class="value">{{ $reportData['client_code'] ?? '' }}</div>
      </div>
    </div>
    <div class="grid-3" style="margin-top:10px">
      <div>
        <div class="label">NÚMERO DO PLANO:</div>
        <div class="value" contenteditable="true">{{ $reportData['plan_number'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">Número do Mês</div>
        <div class="value" contenteditable="true">{{ $reportData['month_number'] ?? '' }}</div>
      </div>
      <div>
        <div class="label">DATA DO RELATÓRIO:</div>
        <div class="value">{{ $reportData['report_date'] ?? '' }}</div>
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Plano</h2>
    <div class="grid-3" style="grid-template-columns: 2fr 0.8fr 0.8fr;">
      <div>
        <div class="label">PLANO:</div>
        <div class="value" contenteditable="true">{{ $reportData['plan_name'] ?? '' }}</div>

        <div class="label" style="margin-top:10px">NIF</div>
        <div class="value" contenteditable="true">{{ $reportData['nif'] ?? '' }}</div>

        <div class="label" style="margin-top:10px">Tipo de saída</div>
        <div class="value">
          <select class="js-save-select" style="border:0; width:100%; padding:0; font:inherit; background:transparent;">
            @php($tipoSaida = (string)($reportData['tipo_saida'] ?? ''))
            <option value="" {{ $tipoSaida === '' ? 'selected' : '' }}></option>
            <option value="MF - Pré paga" {{ $tipoSaida === 'MF - Pré paga' ? 'selected' : '' }}>MF - Pré paga</option>
            <option value="MF - Paga pendente" {{ $tipoSaida === 'MF - Paga pendente' ? 'selected' : '' }}>MF - Paga pendente</option>
            <option value="CC - Pré paga" {{ $tipoSaida === 'CC - Pré paga' ? 'selected' : '' }}>CC - Pré paga</option>
            <option value="CC - À cobrança" {{ $tipoSaida === 'CC - À cobrança' ? 'selected' : '' }}>CC - À cobrança</option>
          </select>
        </div>
      </div
      ><div>
        <div class="label">N.º DE CÁPSULAS POR DIA:</div>
        <div class="value" contenteditable="true">{{ $reportData['capsules'] ?? '' }}</div>
      </div
      ><div>
        <div class="label">Cor Capas</div>
        <div class="value" contenteditable="true"></div>
      </div>
    </div>
    <div style="margin-top:10px">
      <div class="label">PESO LÍQUIDO:</div>
      <div class="value">{{ $reportData['net_weight'] ?? '' }}</div>
    </div>
    <div style="margin-top:10px">
      <div class="label">Como tomar MyFórmula {{ $reportData['plan_letters'] ?? '' }}</div>
      <div class="value" style="height:60px" contenteditable="true">{{ $reportData['how_to_take'] ?? '' }}</div>
    </div>
  </div>

  <div class="section">
    <h2>Suplementos</h2>
    <div class="grid-3">
      @foreach (($reportData['supplements_by_period'] ?? []) as $group)
        <div class="supp-col {{ ($group['title'] ?? '') === 'Tarde' ? 'supp-col--tarde' : '' }}">
          <strong>{{ $group['title'] }}</strong>
          @if (!empty($group['items']))
            <ul style="margin:6px 0 0 18px; padding:0;">
              @foreach ($group['items'] as $item)
                <li>
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                    <span>{{ $item['name'] }}</span>
                    <input type="checkbox" class="check" />
                  </div>
                </li>
              @endforeach
            </ul>
          @else
            <div class="subtle" style="margin-top:6px">—</div>
          @endif
        </div>
      @endforeach
    </div>

  </div>

  <div class="section">
    <h2>Verificações Finais para Checkout</h2>
    <table>
      <thead>
        <tr>
          <th>Item</th>
          <th>Detalhes</th>
          <th style="width:80px; text-align:center">OK</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Blisters e Toma</td>
          <td>Como tomar MyFórmula {{ $reportData['plan_letters'] ?? '' }} — {{ $reportData['how_to_take'] ?? '' }}</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
        <tr>
          <td>Etiquetas do cliente</td>
          <td>1/capa, interior</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
        <tr>
          <td>Etiqueta global</td>
          <td>1/embalagem, fundo da manga</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
        <tr>
          <td>Post-it Nome do Cliente</td>
          <td>1/embalagem, frente da manga</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
        <tr>
          <td>Registo por fotos</td>
          <td>por cada capa</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
        <tr>
          <td>Embalagem final</td>
          <td>Plastificação + Caixa Protetora</td>
          <td style="text-align:center"><input type="checkbox" class="check" /></td>
        </tr>
      </tbody>
    </table>
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

  <div class="section">
    <h2>Registo de Preparação e Envio</h2>
    <div>
      <div class="label">Data do Pedido</div>
      <div class="value">{{ optional($order->date_added)->format('d/m/Y H:i') }}</div>
    </div>
    <div class="grid-2" style="margin-top:10px">
      <div>
        <div class="label">Data da Preparação</div>
        <div class="value">
          <input type="date" style="border:0; width:100%; padding:0; font:inherit; background:transparent;" />
        </div>
        <div class="label" style="margin-top:8px">Assinatura do Responsável pela Preparação</div>
        <div class="value" style="height:40px" contenteditable="true"></div>
      </div>
      <div>
        <div class="label">Data de Envio</div>
        <div class="value">
          <input type="date" style="border:0; width:100%; padding:0; font:inherit; background:transparent;" />
        </div>
        <div class="label" style="margin-top:8px">Assinatura do Responsável pelo Envio</div>
        <div class="value" style="height:40px" contenteditable="true"></div>
      </div>
    </div>
  </div>

  <div class="print-actions">
    <a href="#" class="btn" id="btn-save">Gravar</a>
    <a href="#" class="btn" onclick="window.print()">Imprimir</a>
  </div>
</div>
<script>
(function(){
  const KEY = 'mf_report_state_{{ $order->order_id }}';
  function collect(){
    return {
      editables: Array.from(document.querySelectorAll('[contenteditable="true"]')).map(el => el.innerHTML),
      dates: Array.from(document.querySelectorAll('input[type="date"]')).map(el => el.value),
      checks: Array.from(document.querySelectorAll('input.check')).map(el => el.checked),
      selects: Array.from(document.querySelectorAll('select.js-save-select')).map(el => el.value)
    };
  }
  function restore(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return;
      const s = JSON.parse(raw);
      const eds = document.querySelectorAll('[contenteditable="true"]');
      eds.forEach((el,i)=>{ if(s.editables && s.editables[i]!==undefined) el.innerHTML = s.editables[i]; });
      const dts = document.querySelectorAll('input[type="date"]');
      dts.forEach((el,i)=>{ if(s.dates && s.dates[i]!==undefined) el.value = s.dates[i]; });
      const chs = document.querySelectorAll('input.check');
      chs.forEach((el,i)=>{ if(s.checks && s.checks[i]!==undefined) el.checked = s.checks[i]; });
      const sels = document.querySelectorAll('select.js-save-select');
      sels.forEach((el,i)=>{ if(s.selects && s.selects[i]!==undefined) el.value = s.selects[i]; });
    }catch(e){}
  }
  document.getElementById('btn-save')?.addEventListener('click', function(ev){
    ev.preventDefault();
    localStorage.setItem(KEY, JSON.stringify(collect()));
    this.textContent = 'Gravado';
    setTimeout(()=> this.textContent = 'Gravar', 1200);
  });
  document.addEventListener('DOMContentLoaded', restore);
})();
</script>
</body>
</html>