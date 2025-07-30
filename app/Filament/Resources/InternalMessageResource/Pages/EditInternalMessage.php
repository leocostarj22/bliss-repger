<?php

namespace App\Filament\Resources\InternalMessageResource\Pages;

use App\Filament\Resources\InternalMessageResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditInternalMessage extends EditRecord
{
    protected static string $resource = InternalMessageResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make(),
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

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}