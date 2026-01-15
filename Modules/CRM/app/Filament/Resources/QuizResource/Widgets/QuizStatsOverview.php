<?php

namespace Modules\CRM\Filament\Resources\QuizResource\Widgets;

use Modules\CRM\Models\Quiz;
use Modules\CRM\Filament\Resources\QuizResource\Pages\ListQuizzes;
use Filament\Widgets\Concerns\InteractsWithPageTable;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class QuizStatsOverview extends BaseWidget
{
    use InteractsWithPageTable;

    protected function getTablePage(): string
    {
        return ListQuizzes::class;
    }

    protected function getStats(): array
    {
        $query = null;
        $usingTableQuery = false;

        try {
            // Tenta obter a query da tabela para respeitar os filtros
            $tableQuery = $this->getPageTableQuery();
            
            if ($tableQuery) {
                $query = $tableQuery;
                $usingTableQuery = true;
            }
        } catch (\Throwable $e) {
            // Falha silenciosa na integração, usa fallback
        }

        // Se falhou ou retornou null, usa query base (fallback seguro)
        if (!$query) {
            $query = Quiz::query();
        }

        try {
            $total = (clone $query)->count();
            
            $completed = (clone $query)->where(function ($q) {
                $q->where('post->step', 'plans')
                  ->orWhereNull('post->step');
            })->count();
            
            $notCompleted = $total - $completed;
            $rate = $total > 0 ? round(($completed / $total) * 100) : 0;

            return [
                Stat::make('Total de Quizzes', $total)
                    ->description($usingTableQuery ? 'Registos filtrados' : 'Total Geral')
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
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('Erro no QuizStatsOverview: ' . $e->getMessage());
            
            return [
                Stat::make('Erro ao carregar', '!')
                    ->description('Verifique os logs')
                    ->color('danger'),
            ];
        }
    }
}