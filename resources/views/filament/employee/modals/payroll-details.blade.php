<div class="space-y-6">
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h3 class="text-lg font-medium">Informações Básicas</h3>
            <dl class="mt-2 space-y-1">
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Funcionário:</dt>
                    <dd class="text-sm font-medium">{{ $payroll->employee->name }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Período:</dt>
                    <dd class="text-sm font-medium">{{ str_pad($payroll->reference_month, 2, '0', STR_PAD_LEFT) }}/{{ $payroll->reference_year }}</dd>
                </div>
            </dl>
        </div>
        
        <div>
            <h3 class="text-lg font-medium">Valores</h3>
            <dl class="mt-2 space-y-1">
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Salário Base:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->base_salary, 2, ',', '.') }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Total Bruto:</dt>
                    <dd class="text-sm font-medium text-green-600">€{{ number_format($payroll->gross_total, 2, ',', '.') }}</dd>
                </div>
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Total Deduções:</dt>
                    <dd class="text-sm font-medium text-red-600">-€{{ number_format($payroll->total_deductions, 2, ',', '.') }}</dd>
                </div>
                <div class="flex justify-between border-t pt-1">
                    <dt class="text-sm font-bold">Líquido:</dt>
                    <dd class="text-sm font-bold">€{{ number_format($payroll->net_total, 2, ',', '.') }}</dd>
                </div>
            </dl>
        </div>
    </div>
    
    <div class="grid grid-cols-2 gap-4">
        <div>
            <h3 class="text-lg font-medium">Subsídios</h3>
            <dl class="mt-2 space-y-1">
                @if($payroll->holiday_allowance > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Subsídio de Férias:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->holiday_allowance, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->christmas_allowance > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Subsídio de Natal:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->christmas_allowance, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->meal_allowance > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Subsídio de Alimentação:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->meal_allowance, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->transport_allowance > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Subsídio de Transporte:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->transport_allowance, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->other_allowances > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Outros Subsídios:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->other_allowances, 2, ',', '.') }}</dd>
                </div>
                @endif
            </dl>
        </div>
        
        <div>
            <h3 class="text-lg font-medium">Deduções</h3>
            <dl class="mt-2 space-y-1">
                @if($payroll->social_security_employee > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Segurança Social:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->social_security_employee, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->irs_withholding > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Retenção IRS:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->irs_withholding, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->union_fee > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Quota Sindical:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->union_fee, 2, ',', '.') }}</dd>
                </div>
                @endif
                @if($payroll->other_deductions > 0)
                <div class="flex justify-between">
                    <dt class="text-sm text-gray-500">Outras Deduções:</dt>
                    <dd class="text-sm font-medium">€{{ number_format($payroll->other_deductions, 2, ',', '.') }}</dd>
                </div>
                @endif
            </dl>
        </div>
    </div>
</div>