<?php

namespace Modules\HumanResources\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Department;
use App\Models\Employee;
use Filament\Widgets\ChartWidget;

class EmployeesByDepartmentChart extends ChartWidget
{
    protected static ?string $heading = 'Funcionários por Departamento';
    
    protected int | string | array $columnSpan = 'full';

    protected function getData(): array
    {
        $departments = Department::withCount(['employees' => function ($query) {
            $query->where('status', 'active');
        }])->get();

        return [
            'datasets' => [
                [
                    'label' => 'Funcionários Ativos',
                    'data' => $departments->pluck('employees_count')->toArray(),
                    'backgroundColor' => [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#FF6384',
                        '#C9CBCF',
                    ],
                ],
            ],
            'labels' => $departments->pluck('name')->toArray(),
        ];
    }

    protected function getType(): string
    {
        return 'doughnut';
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