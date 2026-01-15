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
        try {
            // Tenta obter a query da tabela
            $query = $this->getPageTableQuery();
            
            // Se a query não estiver disponível, retorna vazio para não quebrar a página
            if (!$query) {
                return [];
            }

            // Clona para não afetar a query original da tabela
            $total = (clone $query)->count();
            
            // Lógica de concluído: step == 'plans' ou step é null (conforme filtro da tabela)
            $completed = (clone $query)->where(function ($q) {
                $q->where('post->step', 'plans')
                  ->orWhereNull('post->step');
            })->count();
            
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
        } catch (\Throwable $e) {
            // Em caso de erro, loga e retorna stats de erro/vazios para não dar 500 na página
            \Illuminate\Support\Facades\Log::error('Erro no QuizStatsOverview: ' . $e->getMessage());
            
            return [
                Stat::make('Erro ao carregar', '!')
                    ->description('Verifique os logs')
                    ->color('danger'),
            ];
        }
    }
}