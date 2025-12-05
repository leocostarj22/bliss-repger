<?php

namespace Modules\Products\Filament\Resources\ProductCategoryResource\Pages;

use Modules\Products\Filament\Resources\ProductCategoryResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListProductCategories extends ListRecords
{
    protected static string $resource = ProductCategoryResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}