<?php

namespace App\Filament\Employee\Resources\TaskResource\Pages;

use App\Filament\Employee\Resources\TaskResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;
use App\Filament\Employee\Widgets\EmployeeInfoWidget;
use App\Filament\Employee\Widgets\TaskStatsWidget;
use App\Filament\Employee\Widgets\UpcomingTasksWidget;
use App\Filament\Employee\Widgets\TaskCalendarWidget;

class ListTasks extends ListRecords
{
    protected static string $resource = TaskResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('create')
                ->label('Nova Tarefa')
                ->icon('heroicon-o-plus')
                ->url(static::getResource()::getUrl('create'))
        ];
    }
    
    protected function getHeaderWidgets(): array
    {
        return [
            EmployeeInfoWidget::class,
            TaskStatsWidget::class,
            UpcomingTasksWidget::class,
            TaskCalendarWidget::class,
        ];
    }
}
