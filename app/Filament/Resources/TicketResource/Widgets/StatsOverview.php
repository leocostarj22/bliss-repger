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
        // Consulta otimizada com agregações
        $stats = Ticket::selectRaw('
            COUNT(*) as total,
            SUM(CASE WHEN status IN (?, ?, ?) THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as resolved_count,
            SUM(CASE WHEN priority = ? AND status NOT IN (?, ?) THEN 1 ELSE 0 END) as urgent_count,
            SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) as new_this_week
        ', [
            Ticket::STATUS_OPEN, 
            Ticket::STATUS_IN_PROGRESS, 
            Ticket::STATUS_PENDING,
            Ticket::STATUS_RESOLVED, 
            Ticket::STATUS_CLOSED,
            Ticket::PRIORITY_URGENT,
            Ticket::STATUS_RESOLVED, 
            Ticket::STATUS_CLOSED
        ])->first();
        
        // Calcular taxa de resolução dos últimos 30 dias
        $resolutionStats = Ticket::selectRaw('
            COUNT(*) as total_last_month,
            SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as resolved_last_month
        ', [Ticket::STATUS_RESOLVED, Ticket::STATUS_CLOSED])
        ->where('created_at', '>=', now()->subDays(30))
        ->first();
        
        $resolutionRate = $resolutionStats->total_last_month > 0 
            ? round(($resolutionStats->resolved_last_month / $resolutionStats->total_last_month) * 100, 1)
            : 0;
            
        // Calcular tempo médio de resolução
        $avgResolutionTime = Ticket::whereNotNull('resolved_at')
            ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
            ->value('avg_hours');
            
        $avgTimeFormatted = 'N/A';
        $avgTimeColor = 'gray';
        $avgTimeIcon = 'heroicon-m-question-mark-circle';
        $avgTimeDescription = 'Sem dados suficientes';
        
        if ($avgResolutionTime) {
            $hours = round($avgResolutionTime, 1);
            if ($hours < 24) {
                $avgTimeFormatted = $hours . 'h';
                $avgTimeColor = 'success';
                $avgTimeIcon = 'heroicon-m-bolt';
                $avgTimeDescription = 'Resolução rápida';
            } else {
                $days = round($hours / 24, 1);
                $avgTimeFormatted = $days . 'd';
                if ($days <= 3) {
                    $avgTimeColor = 'warning';
                    $avgTimeIcon = 'heroicon-m-clock';
                    $avgTimeDescription = 'Dentro do prazo';
                } else {
                    $avgTimeColor = 'danger';
                    $avgTimeIcon = 'heroicon-m-exclamation-triangle';
                    $avgTimeDescription = 'Pode melhorar';
                }
            }
        }
        
        // Calcular percentual de tickets resolvidos
        $resolvedPercentage = $stats->total > 0 
            ? round(($stats->resolved_count / $stats->total) * 100, 1) . '% do total'
            : 'Nenhum ticket ainda';
            
        return [
            // Total de Tickets
            Stat::make('Total de Tickets', $stats->total)
                ->description($stats->new_this_week . ' novos esta semana')
                ->descriptionIcon('heroicon-m-plus-circle')
                ->icon('heroicon-o-ticket')
                ->color($stats->total > 100 ? 'warning' : 'primary'),
                
            // Tickets Abertos
            Stat::make('Tickets Abertos', $stats->open_count)
                ->description('Aguardando resolução')
                ->descriptionIcon('heroicon-m-clock')
                ->icon('heroicon-o-folder-open')
                ->color($stats->open_count > 20 ? 'danger' : ($stats->open_count > 10 ? 'warning' : 'success')),
                
            // Tickets Resolvidos
            Stat::make('Tickets Resolvidos', $stats->resolved_count)
                ->description($resolvedPercentage)
                ->descriptionIcon('heroicon-m-check-circle')
                ->icon('heroicon-o-check-badge')
                ->color('success'),
                
            // Tickets Urgentes
            Stat::make('Tickets Urgentes', $stats->urgent_count)
                ->description($stats->urgent_count > 0 ? 'Requer atenção!' : 'Tudo sob controle')
                ->descriptionIcon($stats->urgent_count > 0 ? 'heroicon-m-fire' : 'heroicon-m-shield-check')
                ->icon('heroicon-o-exclamation-circle')
                ->color($stats->urgent_count > 5 ? 'danger' : ($stats->urgent_count > 0 ? 'warning' : 'success')),
                
            // Taxa de Resolução
            Stat::make('Taxa de Resolução', $resolutionRate . '%')
                ->description('Últimos 30 dias')
                ->descriptionIcon($resolutionRate >= 80 ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->icon('heroicon-o-chart-bar-square')
                ->color($resolutionRate >= 80 ? 'success' : ($resolutionRate >= 60 ? 'warning' : 'danger')),

            // Tempo Médio de Resolução
            Stat::make('Tempo Médio', $avgTimeFormatted)
                ->description($avgTimeDescription)
                ->descriptionIcon($avgTimeIcon)
                ->icon('heroicon-o-clock')
                ->color($avgTimeColor),
        ];
    }

    protected static ?int $sort = 1;

    protected function getColumns(): int
    {
        return 3; // Exibe 3 estatísticas por linha
    }

    // Atualização automática otimizada
    protected static ?string $pollingInterval = '2m'; // 2 minutos
    
    // Performance otimizada
    protected static bool $isLazy = false;
}