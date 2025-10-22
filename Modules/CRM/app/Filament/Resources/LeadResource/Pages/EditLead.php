<?php

namespace Modules\CRM\Filament\Resources\LeadResource\Pages;

use Modules\CRM\Filament\Resources\LeadResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditLead extends EditRecord
{
    protected static string $resource = LeadResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\ForceDeleteAction::make()
                ->requiresConfirmation()
                ->modalHeading('Apagar definitivamente')
                ->modalDescription('Esta ação remove o lead do banco de dados.'),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}