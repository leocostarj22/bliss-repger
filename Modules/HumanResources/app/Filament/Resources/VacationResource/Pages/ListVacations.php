<?php

namespace Modules\HumanResources\Filament\Resources\VacationResource\Pages;

use Modules\HumanResources\Filament\Resources\VacationResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListVacations extends ListRecords
{
    protected static string $resource = VacationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make()
                ->label('Nova Solicitação de Férias'),
        ];
    }
}