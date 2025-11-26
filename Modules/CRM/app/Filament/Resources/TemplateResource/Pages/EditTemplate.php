<?php

namespace Modules\CRM\Filament\Resources\TemplateResource\Pages;

use Modules\CRM\Filament\Resources\TemplateResource;
use Filament\Resources\Pages\EditRecord;

class EditTemplate extends EditRecord
{
    protected static string $resource = TemplateResource::class;

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}