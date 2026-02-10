<?php

namespace Modules\CRM\Filament\Resources\LeadResource\Pages;

use Modules\CRM\Filament\Resources\LeadResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewLead extends ViewRecord
{
    protected static string $resource = LeadResource::class;

    public function getMaxContentWidth(): ?string
    {
        return 'full';
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\ForceDeleteAction::make()
                ->requiresConfirmation()
                ->modalHeading('Apagar definitivamente')
                ->modalDescription('Esta ação remove o lead do banco de dados.'),
        ];
    }
}