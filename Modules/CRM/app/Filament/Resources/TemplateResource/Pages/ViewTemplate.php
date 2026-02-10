<?php

namespace Modules\CRM\Filament\Resources\TemplateResource\Pages;

use Modules\CRM\Filament\Resources\TemplateResource;
use Filament\Resources\Pages\ViewRecord;

class ViewTemplate extends ViewRecord
{
    protected static string $resource = TemplateResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}