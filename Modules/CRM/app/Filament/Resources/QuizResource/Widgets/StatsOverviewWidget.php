<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Widgets;

use Modules\CRM\Models\Quiz;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class QuizStatsOverview extends BaseWidget
{
    protected function getStats(): array
    {
        // Usa a conexão myformula automaticamente via Model
        $total = Quiz::count();

        // Concluído: step == 'plans'
        $completed = Quiz::where('post->step', 'plans')->count();

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