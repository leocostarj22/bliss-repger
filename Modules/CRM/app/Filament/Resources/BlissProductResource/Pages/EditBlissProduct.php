<?php

namespace Modules\CRM\Filament\Resources\BlissProductResource\Pages;

use Modules\CRM\Filament\Resources\BlissProductResource;
use Filament\Resources\Pages\EditRecord;

class EditBlissProduct extends EditRecord
{
    protected static string $resource = BlissProductResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}