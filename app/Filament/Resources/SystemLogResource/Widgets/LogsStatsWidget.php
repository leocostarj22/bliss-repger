<?php

namespace App\Filament\Resources\SystemLogResource\Widgets;

use App\Models\SystemLog;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Carbon\Carbon;

class LogsStatsWidget extends BaseWidget
{
    protected static ?string $pollingInterval = '30s';
    protected static ?int $sort = 1;

    protected function getStats(): array
    {
        $today = Carbon::today();
        $yesterday = Carbon::yesterday();
        $thisWeek = Carbon::now()->startOfWeek();
        
        return [
            Stat::make('Logs Hoje', SystemLog::whereDate('created_at', $today)->count())
                ->description('Registros de hoje')
                ->descriptionIcon('heroicon-m-calendar-days')
                ->color('success'),
                
            Stat::make('Erros Hoje', SystemLog::whereDate('created_at', $today)
                ->whereIn('level', ['error', 'critical'])->count())
                ->description('Erros registrados hoje')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color('danger'),
                
            Stat::make('Esta Semana', SystemLog::where('created_at', '>=', $thisWeek)->count())
                ->description('Total desta semana')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('primary'),
                
            Stat::make('Usuários Ativos', SystemLog::whereDate('created_at', $today)
                ->whereNotNull('user_id')
                ->distinct('user_id')
                ->count('user_id'))
                ->description('Utilizadores com atividade hoje')
                ->descriptionIcon('heroicon-m-users')
                ->color('warning'),
        ];
    }
}