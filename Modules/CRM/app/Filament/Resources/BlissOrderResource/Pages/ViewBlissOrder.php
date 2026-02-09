<?php

namespace Modules\CRM\Filament\Resources\BlissOrderResource\Pages;

use Modules\CRM\Filament\Resources\BlissOrderResource;
use Filament\Resources\Pages\ViewRecord;

class ViewBlissOrder extends ViewRecord
{
    protected static string $resource = BlissOrderResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}