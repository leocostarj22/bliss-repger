<?php

namespace App\Filament\Resources\TaskResource\Widgets;

use App\Models\Task;
use Filament\Widgets\StatsOverviewWidget as BaseWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;

class TaskStatsWidget extends BaseWidget
{
    protected function getStats(): array
    {
        $user = Auth::user();
        $userClass = get_class($user);
        $userId = $user->id;
        
        // Consultas diretas ao modelo Task
        $totalTasks = Task::where('taskable_type', $userClass)
            ->where('taskable_id', $userId)
            ->count();
            
        $pendingTasks = Task::where('taskable_type', $userClass)
            ->where('taskable_id', $userId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->count();
            
        $completedTasks = Task::where('taskable_type', $userClass)
            ->where('taskable_id', $userId)
            ->where('status', 'completed')
            ->count();
            
        $overdueTasks = Task::where('taskable_type', $userClass)
            ->where('taskable_id', $userId)
            ->whereNotIn('status', ['completed', 'cancelled'])
            ->where('due_date', '<', Carbon::now())
            ->count();
        
        return [
            Stat::make('Total de Tarefas', $totalTasks)
                ->description('Todas as suas tarefas')
                ->descriptionIcon('heroicon-m-clipboard-document-list')
                ->color('primary'),
                
            Stat::make('Tarefas Pendentes', $pendingTasks)
                ->description('Aguardando execução')
                ->descriptionIcon('heroicon-m-clock')
                ->color('warning'),
                
            Stat::make('Tarefas Concluídas', $completedTasks)
                ->description('Finalizadas com sucesso')
                ->descriptionIcon('heroicon-m-check-circle')
                ->color('success'),
                
            Stat::make('Tarefas em Atraso', $overdueTasks)
                ->description('Vencimento ultrapassado')
                ->descriptionIcon('heroicon-m-exclamation-triangle')
                ->color('danger'),
        ];
    }
}