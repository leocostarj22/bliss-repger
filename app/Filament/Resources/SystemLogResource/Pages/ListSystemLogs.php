<?php

namespace App\Filament\Resources\SystemLogResource\Pages;

use App\Filament\Resources\SystemLogResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListSystemLogs extends ListRecords
{
    protected static string $resource = SystemLogResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Não permitir criação manual de logs
        ];
    }
    
    protected function getHeaderWidgets(): array
    {
        return [
            \App\Filament\Resources\SystemLogResource\Widgets\LogsStatsWidget::class,
        ];
    }
    
    protected function getFooterWidgets(): array
    {
        return [
            \App\Filament\Resources\SystemLogResource\Widgets\RecentActivityWidget::class,
        ];
    }
}