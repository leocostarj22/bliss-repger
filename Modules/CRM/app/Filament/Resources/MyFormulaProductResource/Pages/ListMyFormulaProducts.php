<?php

namespace Modules\CRM\Filament\Resources\MyFormulaProductResource\Pages;

use Modules\CRM\Filament\Resources\MyFormulaProductResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListMyFormulaProducts extends ListRecords
{
    protected static string $resource = MyFormulaProductResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }
}