<?php

namespace Modules\CRM\Filament\Resources\BlissCustomerResource\Pages;

use Modules\CRM\Filament\Resources\BlissCustomerResource;
use Filament\Resources\Pages\EditRecord;

class EditBlissCustomer extends EditRecord
{
    protected static string $resource = BlissCustomerResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}