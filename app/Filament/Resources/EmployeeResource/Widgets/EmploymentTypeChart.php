<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Facades\DB;

class EmploymentTypeChart extends ChartWidget
{
    protected static ?string $heading = 'Distribuição por Tipo de Contrato';
    
    protected int | string | array $columnSpan = 'full';

    protected function getData(): array
    {
        $employmentTypes = Employee::select('employment_type', DB::raw('count(*) as total'))
            ->where('status', 'active')
            ->groupBy('employment_type')
            ->get();

        $labels = $employmentTypes->pluck('employment_type')->map(function ($type) {
            return match ($type) {
                'CLT' => 'Contrato sem Termo',
                'PJ' => 'Prestação de Serviços',
                'Intern' => 'Estagiário',
                'Temporary' => 'Contrato a Termo',
                default => $type,
            };
        })->toArray();

        return [
            'datasets' => [
                [
                    'label' => 'Funcionários por Tipo de Contrato',
                    'data' => $employmentTypes->pluck('total')->toArray(),
                    'backgroundColor' => [
                        '#10B981', // success - CLT
                        '#3B82F6', // info - PJ
                        '#F59E0B', // warning - Intern
                        '#EF4444', // danger - Temporary
                    ],
                ],
            ],
            'labels' => $labels,
        ];
    }

    protected function getType(): string
    {
        return 'pie';
    }
    
    protected function getOptions(): array
    {
        return [
            'plugins' => [
                'legend' => [
                    'display' => true,
                    'position' => 'bottom',
                ],
            ],
            'responsive' => true,
            'maintainAspectRatio' => false,
        ];
    }
}