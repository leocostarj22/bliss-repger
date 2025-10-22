<?php

namespace Modules\CRM\Filament\Resources\LeadResource\Pages;

use Modules\CRM\Filament\Resources\LeadResource;
use Filament\Resources\Pages\CreateRecord;

class CreateLead extends CreateRecord
{
    protected static string $resource = LeadResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}