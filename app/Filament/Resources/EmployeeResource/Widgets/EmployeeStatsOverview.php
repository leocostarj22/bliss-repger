<?php

namespace App\Filament\Resources\EmployeeResource\Widgets;

use App\Models\Employee;
use App\Models\EmployeeUser;
use App\Filament\Resources\EmployeeResource;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class EmployeeStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        $totalEmployees = Employee::count();
        $newHiresThisMonth = Employee::whereMonth('hire_date', Carbon::now()->month)
            ->whereYear('hire_date', Carbon::now()->year)
            ->count();
        $birthdaysThisMonth = Employee::whereMonth('birth_date', Carbon::now()->month)
            ->where('status', 'active')
            ->count();
        
        // Funcionários online (logados nas últimas 15 minutos)
        $onlineEmployees = EmployeeUser::where('last_login_at', '>=', Carbon::now()->subMinutes(15))
            ->where('is_active', true)
            ->count();
        
        return [
            Stat::make('Total de Funcionários', $totalEmployees)
                ->description('Todos os funcionários cadastrados')
                ->descriptionIcon('heroicon-m-users')
                ->color('primary')
                ->url(EmployeeResource::getUrl('index')),
                
            Stat::make('Funcionários Online', $onlineEmployees)
                ->description('Ativos nos últimos 15 minutos')
                ->descriptionIcon('heroicon-m-signal')
                ->color('success')
                ->url(EmployeeResource::getUrl('index', ['tableFilters' => ['status' => ['value' => 'active']]])),
                
            Stat::make('Contratações este Mês', $newHiresThisMonth)
                ->description('Novos funcionários em ' . Carbon::now()->translatedFormat('F'))
                ->descriptionIcon('heroicon-m-user-plus')
                ->color('info')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => [
                        'hire_date' => [
                            'from' => Carbon::now()->startOfMonth()->format('Y-m-d'),
                            'until' => Carbon::now()->endOfMonth()->format('Y-m-d')
                        ]
                    ]
                ])),
                
            Stat::make('Aniversariantes', $birthdaysThisMonth)
                ->description('Aniversários em ' . Carbon::now()->translatedFormat('F'))
                ->descriptionIcon('heroicon-m-cake')
                ->color('warning')
                ->url(EmployeeResource::getUrl('index', [
                    'tableFilters' => [
                        'birth_month' => Carbon::now()->month
                    ]
                ])),
        ];
    }
}