<?php

namespace Modules\CRM\Filament\Resources\MyFormulaCustomerResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaCustomerResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMyFormulaCustomers extends ListRecords
{
    protected static string $resource = MyFormulaCustomerResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}