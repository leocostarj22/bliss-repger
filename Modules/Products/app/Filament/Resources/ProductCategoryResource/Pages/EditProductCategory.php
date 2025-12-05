<?php

namespace Modules\Products\Filament\Resources\ProductCategoryResource\Pages;

use Modules\Products\Filament\Resources\ProductCategoryResource;
use Filament\Resources\Pages\EditRecord;

class EditProductCategory extends EditRecord
{
    protected static string $resource = ProductCategoryResource::class;


    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}