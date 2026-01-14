<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Widgets;

use Modules\CRM\Models\Quiz;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Filament\Widgets\Concerns\InteractsWithPageTable;

class QuizStatsOverview extends BaseWidget
{
    use InteractsWithPageTable;

    protected function getStats(): array
    {
        // Obtém a query filtrada da tabela da página
        $query = $this->getPageTableQuery();
        
        // Clona a query para não afetar as próximas contagens
        $total = (clone $query)->count();

        // Concluído: step == 'plans'
        // Aplica filtro adicional na query já filtrada
        $completed = (clone $query)->where('post->step', 'plans')->count();

        $notCompleted = $total - $completed;
        $rate = $total > 0 ? round(($completed / $total) * 100) : 0;

        return [
            Stat::make('Total de Quizzes', $total)
                ->description('Registos importados')
                ->color('primary'),

            Stat::make('Concluídos', $completed)
                ->description('Chegaram ao fim')
                ->color('success'),

            Stat::make('Não Finalizados', $notCompleted)
                ->description('Abandonaram a meio')
                ->color('warning'),

            Stat::make('Taxa de Conclusão', $rate . '%')
                ->description('Performance global')
                ->chart([$rate, max(0, 100 - $rate)])
                ->color($rate > 50 ? 'success' : 'danger'),
        ];
    }
}