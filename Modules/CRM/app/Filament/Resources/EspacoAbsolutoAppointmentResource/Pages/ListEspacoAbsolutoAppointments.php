<?php

namespace Modules\CRM\Filament\Resources\EspacoAbsolutoAppointmentResource\Pages;

use Modules\CRM\Filament\Resources\EspacoAbsolutoAppointmentResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListEspacoAbsolutoAppointments extends ListRecords
{
    protected static string $resource = EspacoAbsolutoAppointmentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Actions\CreateAction::make(),
        ];
    }

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }
}