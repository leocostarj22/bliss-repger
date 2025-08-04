<?php

namespace App\Filament\Employee\Resources\TaskResource\Pages;

use App\Filament\Employee\Resources\TaskResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use App\Filament\Employee\Widgets\TaskStatsWidget;
use App\Filament\Employee\Widgets\UpcomingTasksWidget;
use App\Filament\Employee\Widgets\TaskCalendarWidget;
use App\Filament\Employee\Widgets\EmployeeInfoWidget;

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
            EmployeeInfoWidget::class,
            UpcomingTasksWidget::class,
            TaskCalendarWidget::class,
        ];
    }
}