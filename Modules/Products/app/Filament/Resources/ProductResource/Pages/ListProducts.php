<?php

namespace Modules\Products\Filament\Resources\ProductResource\Pages;

use Modules\Products\Filament\Resources\ProductResource;
use Modules\Products\Filament\Widgets\ProductStatsOverview;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListProducts extends ListRecords
{
    protected static string $resource = ProductResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }

    protected function getHeaderWidgets(): array
    {
        return [ProductStatsOverview::class];
    }
}