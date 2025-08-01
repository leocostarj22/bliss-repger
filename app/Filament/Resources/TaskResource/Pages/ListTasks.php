<?php

namespace App\Filament\Resources\TaskResource\Pages;

use App\Filament\Resources\TaskResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use App\Filament\Resources\TaskResource\Widgets\TaskStatsWidget;
use App\Filament\Resources\TaskResource\Widgets\UpcomingTasksWidget;
use App\Filament\Resources\TaskResource\Widgets\TaskCalendarWidget;

class ListTasks extends ListRecords
{
    protected static string $resource = TaskResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()
                ->label('Nova Tarefa'),
        ];
    }
    
    protected function getHeaderWidgets(): array
    {
        return [
            TaskStatsWidget::class,
            UpcomingTasksWidget::class,
            TaskCalendarWidget::class,
        ];
    }
}