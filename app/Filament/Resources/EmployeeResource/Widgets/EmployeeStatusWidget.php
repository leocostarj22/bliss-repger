<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class EmployeeStatusWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $activeEmployees = Employee::where('status', 'active')->count();
        $inactiveEmployees = Employee::where('status', 'inactive')->count();
        $terminatedEmployees = Employee::where('status', 'terminated')->count();
        $onLeaveEmployees = Employee::where('status', 'on_leave')->count();
        
        return [
            Stat::make('Funcionários Ativos', $activeEmployees)
                ->description('Total de funcionários ativos')
                ->descriptionIcon('heroicon-m-users')
                ->color('success'),
                
            Stat::make('Funcionários Inativos', $inactiveEmployees)
                ->description('Funcionários temporariamente inativos')
                ->descriptionIcon('heroicon-m-user-minus')
                ->color('warning'),
                
            Stat::make('Funcionários Cessados', $terminatedEmployees)
                ->description('Funcionários que cessaram funções')
                ->descriptionIcon('heroicon-m-x-circle')
                ->color('danger'),
                
            Stat::make('Funcionários Afastados', $onLeaveEmployees)
                ->description('Funcionários em licença/afastamento')
                ->descriptionIcon('heroicon-m-clock')
                ->color('info'),
        ];
    }
}