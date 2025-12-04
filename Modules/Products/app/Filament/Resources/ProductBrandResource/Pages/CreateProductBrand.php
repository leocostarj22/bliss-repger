<?php

namespace Modules\Products\Filament\Resources\ProductBrandResource\Pages;

use Modules\Products\Filament\Resources\ProductBrandResource;
use Filament\Resources\Pages\CreateRecord;

class CreateProductBrand extends CreateRecord
{
    protected static string $resource = ProductBrandResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['company_id'] = auth()->user()?->company_id;
        return $data;
    }
}