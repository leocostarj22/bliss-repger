<?php

namespace Modules\HumanResources\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Modules\HumanResources\Filament\Resources\EmployeeResource;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class EmployeeStatusWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $activeEmployees = Employee::where('status', 'active')->count();
        $inactiveEmployees = Employee::where('status', 'inactive')->count();
        $onLeaveEmployees = Employee::where('status', 'on_leave')->count();
        
        // Funcionários próximos da aposentadoria (65+ anos)
        $nearRetirement = Employee::where('status', 'active')
            ->whereRaw('DATEDIFF(CURDATE(), birth_date) / 365.25 >= 65')
            ->count();
        
        return [
            Stat::make('Funcionários Ativos', $activeEmployees)
                ->description('Total de funcionários ativos')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'active']]
                ])),
                
            Stat::make('Funcionários Inativos', $inactiveEmployees)
                ->description('Funcionários temporariamente inativos')
                ->descriptionIcon('heroicon-m-user-minus')
                ->color('warning')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'inactive']]
                ])),
                
            Stat::make('Funcionários Afastados', $onLeaveEmployees)
                ->description('Funcionários em licença/afastamento')
                ->descriptionIcon('heroicon-m-clock')
                ->color('info')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => ['status' => ['value' => 'on_leave']]
                ])),
                
            Stat::make('Próximos da Aposentadoria', $nearRetirement)
                ->description('Funcionários com 65+ anos')
                ->descriptionIcon('heroicon-m-academic-cap')
                ->color('gray')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => [
                        'age_range' => ['from' => 65]
                    ]
                ])),
        ];
    }
}