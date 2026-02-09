<?php

namespace Modules\CRM\Filament\Resources\BlissProductResource\Pages;

use Modules\CRM\Filament\Resources\BlissProductResource;
use Filament\Resources\Pages\CreateRecord;

class CreateBlissProduct extends CreateRecord
{
    protected static string $resource = BlissProductResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}