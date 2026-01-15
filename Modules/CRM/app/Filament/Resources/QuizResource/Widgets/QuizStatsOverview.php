<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Widgets;

use Modules\CRM\Models\Quiz;
use Filament\Widgets\Concerns\InteractsWithPageTable;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class QuizStatsOverview extends BaseWidget
{
    use InteractsWithPageTable;

    protected function getStats(): array
    {
        $query = $this->getPageTableQuery();
        
        // Se a query não estiver disponível (ex: carregamento inicial ou erro), fallback para query padrão
        if (!$query) {
            return [];
        }

        $total = (clone $query)->count();
        
        // Lógica de concluído: step == 'plans'
        // Nota: A query já vem filtrada da tabela, então aplicamos condições adicionais sobre o resultado filtrado
        $completed = (clone $query)->where('post->step', 'plans')->count();
        
        $notCompleted = $total - $completed;
        $rate = $total > 0 ? round(($completed / $total) * 100) : 0;

        return [
            Stat::make('Total de Quizzes', $total)
                ->description('Registos filtrados')
                ->color('primary'),
            
            Stat::make('Concluídos', $completed)
                ->description('Chegaram ao fim')
                ->color('success'),

            Stat::make('Não Finalizados', $notCompleted)
                ->description('Abandonaram a meio')
                ->color('warning'),

            Stat::make('Taxa de Conclusão', $rate . '%')
                ->description('Performance atual')
                ->chart([$rate, 100])
                ->color($rate > 50 ? 'success' : 'danger'),
        ];
    }
}