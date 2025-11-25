<?php

namespace Modules\CRM\Filament\Resources\ContactResource\Pages;

use Modules\CRM\Filament\Resources\ContactResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListContacts extends ListRecords
{
    protected static string $resource = ContactResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}