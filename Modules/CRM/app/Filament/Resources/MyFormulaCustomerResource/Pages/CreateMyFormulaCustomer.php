<?php

namespace Modules\CRM\Filament\Resources\MyFormulaCustomerResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaCustomerResource;
use Filament\Resources\Pages\CreateRecord;

class CreateMyFormulaCustomer extends CreateRecord
{
    protected static string $resource = MyFormulaCustomerResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
        
}
protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}