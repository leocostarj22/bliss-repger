<?php

namespace Modules\CRM\Filament\Resources\BlissCustomerResource\Pages;

use Modules\CRM\Filament\Resources\BlissCustomerResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListBlissCustomers extends ListRecords
{
    protected static string $resource = BlissCustomerResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}