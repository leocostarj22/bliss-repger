<?php

namespace App\Filament\Resources\InternalMessageResource\Pages;

use App\Filament\Resources\InternalMessageResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewInternalMessage extends ViewRecord
{
    protected static string $resource = InternalMessageResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
            Actions\Action::make('send')
                ->label('Enviar')
                ->icon('heroicon-o-paper-airplane')
                ->color('success')
                ->visible(fn (): bool => $this->record->status === 'draft')
                ->action(function () {
                    $this->record->update([
                        'status' => 'sent',
                        'sent_at' => now(),
                    ]);
                    
                    $this->redirect($this->getResource()::getUrl('index'));
                })
                ->requiresConfirmation(),
        ];
    }
}