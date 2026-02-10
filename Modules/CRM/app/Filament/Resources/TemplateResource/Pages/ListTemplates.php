<?php

namespace Modules\CRM\Filament\Resources\TemplateResource\Pages;

use Modules\CRM\Filament\Resources\TemplateResource;
use Filament\Resources\Pages\ListRecords;
use Filament\Actions;

class ListTemplates extends ListRecords
{
    protected static string $resource = TemplateResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}