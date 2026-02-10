<?php

namespace Modules\CRM\Filament\Resources\MyFormulaCustomerResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaCustomerResource;
use Filament\Resources\Pages\EditRecord;

class EditMyFormulaCustomer extends EditRecord
{
    protected static string $resource = MyFormulaCustomerResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}