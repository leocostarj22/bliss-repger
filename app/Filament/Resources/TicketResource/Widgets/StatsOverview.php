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
        // Usar uma única consulta com agregações
        $stats = Ticket::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status IN ("open", "in_progress", "pending") THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status IN ("resolved", "closed") THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN priority = "urgent" AND status NOT IN ("resolved", "closed") THEN 1 ELSE 0 END) as urgent_count
        ')->first();
        
        return [
            Stat::make('Total de Tickets', $stats->total),
            Stat::make('Tickets Abertos', $stats->open_count),
            Stat::make('Tickets Resolvidos', $stats->resolved_count),
            Stat::make('Tickets Urgentes', $stats->urgent_count),
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
    // Comentar ou remover esta linha:
    // protected static ?string $pollingInterval = '30s';
    
    // OU aumentar o intervalo:
    protected static ?string $pollingInterval = '5m'; // 5 minutos
}