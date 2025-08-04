<?php

namespace App\Filament\Employee\Widgets;

use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class EmployeeInfoWidget extends BaseWidget
{
    protected static ?int $sort = 2;
    
    // Ocupar 1 coluna para ficar ao lado do Welcome widget
    protected int | string | array $columnSpan = 1;
    
    protected function getStats(): array
    {
        $employeeUser = Auth::user();
        $employee = $employeeUser->employee;
        
        if (!$employee) {
            return [];
        }
        
        // Cards com títulos ainda menores
        $stats = [
            Stat::make('', $employee->department->name ?? 'N/A')
                ->description('Departamento')
                ->descriptionIcon('heroicon-m-building-office-2')
                ->color('primary')
                ->extraAttributes([
                    'class' => '[&_.fi-wi-stats-overview-stat-value]:!text-xs [&_.fi-wi-stats-overview-stat-value]:!font-normal [&_.fi-wi-stats-overview-stat-description]:!text-xs [&_.fi-wi-stats-overview-stat]:!py-2 [&_.fi-wi-stats-overview-stat]:!mt-0'
                ]),
                
            Stat::make('', $employee->position)
                ->description('Cargo')
                ->descriptionIcon('heroicon-m-briefcase')
                ->color('success')
                ->extraAttributes([
                    'class' => '[&_.fi-wi-stats-overview-stat-value]:!text-xs [&_.fi-wi-stats-overview-stat-value]:!font-normal [&_.fi-wi-stats-overview-stat-description]:!text-xs [&_.fi-wi-stats-overview-stat]:!py-2 [&_.fi-wi-stats-overview-stat]:!mt-0'
                ]),
        ];
        
        return $stats;
    }
    
    // Sobrescrever o método para forçar 2 colunas
    protected function getColumns(): int
    {
        return 2;
    }
    
    // CSS global com títulos menores
    public function getExtraAttributes(): array
    {
        return [
            'style' => '--cols-default: 2; --cols-sm: 2; --cols-md: 2; --cols-lg: 2; --cols-xl: 2; --cols-2xl: 2;',
            'class' => '[&_.fi-wi-stats-overview-stat-value]:!text-xs [&_.fi-wi-stats-overview-stat-value]:!font-normal [&_.fi-wi-stats-overview-stat-description]:!text-xs [&_.fi-wi-stats-overview-stat]:!py-2 [&_.fi-wi-stats-overview-stat]:!min-h-0 [&_.fi-wi-stats-overview-stat]:!mt-0 !mt-0'
        ];
    }
}