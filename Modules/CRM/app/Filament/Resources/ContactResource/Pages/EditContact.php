<?php

namespace Modules\CRM\Filament\Resources\ContactResource\Pages;

use Modules\CRM\Filament\Resources\ContactResource;
use Filament\Resources\Pages\EditRecord;

class EditContact extends EditRecord
{
    protected static string $resource = ContactResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}