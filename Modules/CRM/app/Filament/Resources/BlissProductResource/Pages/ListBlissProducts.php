<?php

namespace Modules\CRM\Filament\Resources\BlissProductResource\Pages;

use Modules\CRM\Filament\Resources\BlissProductResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListBlissProducts extends ListRecords
{
    protected static string $resource = BlissProductResource::class;

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