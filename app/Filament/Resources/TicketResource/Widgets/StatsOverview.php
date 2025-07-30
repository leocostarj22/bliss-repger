<?php

namespace App\Filament\Resources\TicketResource\Widgets;

use App\Models\Ticket;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\DB;

class StatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        return [
            // Total de Tickets
            Stat::make('Total de Tickets', Ticket::count())
                ->description('Total de tickets no sistema')
                ->descriptionIcon('heroicon-m-ticket')
                ->color('primary'),

            // Tickets Abertos
            Stat::make('Tickets Abertos', Ticket::whereIn('status', [
                    Ticket::STATUS_OPEN,
                    Ticket::STATUS_IN_PROGRESS,
                    Ticket::STATUS_PENDING
                ])->count())
                ->description('Tickets que precisam de atenção')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),

            // Tickets Resolvidos
            Stat::make('Tickets Resolvidos', Ticket::whereIn('status', [
                    Ticket::STATUS_RESOLVED,
                    Ticket::STATUS_CLOSED
                ])->count())
                ->description('Tickets finalizados')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),

            // Tickets Urgentes
            Stat::make('Tickets Urgentes', Ticket::where('priority', Ticket::PRIORITY_URGENT)
                ->whereNotIn('status', [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])
                ->count())
                ->description('Tickets com prioridade urgente')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color('danger'),

            // Taxa de Resolução (últimos 30 dias)
            Stat::make('Taxa de Resolução', function () {
                $totalLastMonth = Ticket::where('created_at', '>=', now()->subDays(30))->count();
                $resolvedLastMonth = Ticket::where('created_at', '>=', now()->subDays(30))
                    ->whereIn('status', [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])
                    ->count();
                
                if ($totalLastMonth === 0) {
                    return '0%';
                }
                
                $percentage = round(($resolvedLastMonth / $totalLastMonth) * 100, 1);
                return $percentage . '%';
            })
                ->description('Últimos 30 dias')
                ->descriptionIcon('heroicon-m-chart-bar')
                ->color('info'),

            // Tempo Médio de Resolução
            Stat::make('Tempo Médio', function () {
                $avgResolutionTime = Ticket::whereNotNull('resolved_at')
                    ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                    ->value('avg_hours');
                
                if (!$avgResolutionTime) {
                    return 'N/A';
                }
                
                $hours = round($avgResolutionTime, 1);
                
                if ($hours < 24) {
                    return $hours . 'h';
                } else {
                    $days = round($hours / 24, 1);
                    return $days . 'd';
                }
            })
                ->description('Tempo médio de resolução')
                ->descriptionIcon('heroicon-m-clock')
                ->color('gray'),
        ];
    }

    protected static ?int $sort = 1;

    protected function getColumns(): int
    {
        return 3; // Exibe 3 estatísticas por linha
    }

    // Atualiza automaticamente a cada 30 segundos
    protected static ?string $pollingInterval = '30s';
}