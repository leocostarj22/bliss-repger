<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class EmployeeStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $totalEmployees = Employee::count();
        $activeEmployees = Employee::where('status', 'active')->count();
        $newHiresThisMonth = Employee::whereMonth('hire_date', Carbon::now()->month)
            ->whereYear('hire_date', Carbon::now()->year)
            ->count();
        $birthdaysThisMonth = Employee::whereMonth('birth_date', Carbon::now()->month)
            ->where('status', 'active')
            ->count();
        
        return [
            Stat::make('Total de Funcionários', $totalEmployees)
                ->description('Todos os funcionários cadastrados')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary'),
                
            Stat::make('Funcionários Ativos', $activeEmployees)
                ->description('Funcionários atualmente ativos')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),
                
            Stat::make('Contratações este Mês', $newHiresThisMonth)
                ->description('Novos funcionários em ' . Carbon::now()->translatedFormat('F'))
                ->descriptionIcon('heroicon-m-user-plus')
                ->color('info'),
                
            Stat::make('Aniversariantes', $birthdaysThisMonth)
                ->description('Aniversários em ' . Carbon::now()->translatedFormat('F'))
                ->descriptionIcon('heroicon-m-cake')
                ->color('warning'),
        ];
    }
}