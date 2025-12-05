<?php

namespace Modules\Products\Filament\Resources\ProductBrandResource\Pages;

use Modules\Products\Filament\Resources\ProductBrandResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListProductBrands extends ListRecords
{
    protected static string $resource = ProductBrandResource::class;

    protected function getHeaderActions(): array
    {
        return [Actions\CreateAction::make()];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }   
}