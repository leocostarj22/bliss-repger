<?php

namespace Modules\CRM\Filament\Resources\BlissCustomerResource\Pages;

use Modules\CRM\Filament\Resources\BlissCustomerResource;
use Filament\Resources\Pages\CreateRecord;

class CreateBlissCustomer extends CreateRecord
{
    protected static string $resource = BlissCustomerResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}