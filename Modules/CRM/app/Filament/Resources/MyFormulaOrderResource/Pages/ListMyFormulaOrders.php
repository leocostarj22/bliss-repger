<?php

namespace Modules\CRM\Filament\Resources\MyFormulaOrderResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaOrderResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMyFormulaOrders extends ListRecords
{
    protected static string $resource = MyFormulaOrderResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}