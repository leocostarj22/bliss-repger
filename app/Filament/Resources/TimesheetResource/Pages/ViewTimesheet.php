<?php

namespace App\Filament\Resources\TimesheetResource\Pages;

use App\Filament\Resources\TimesheetResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewTimesheet extends ViewRecord
{
    protected static string $resource = TimesheetResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make()
                ->label('Editar'),
            Actions\Action::make('approve')
                ->label('Aprovar')
                ->icon('heroicon-o-check-circle')
                ->color('success')
                ->requiresConfirmation()
                ->modalHeading('Aprovar Ponto')
                ->modalDescription('Tem certeza que deseja aprovar este registro de ponto?')
                ->action(function () {
                    $this->record->update([
                        'status' => 'approved',
                        'approved_by' => auth()->id(),
                        'approved_at' => now(),
                    ]);
                    
                    $this->notify('success', 'Ponto aprovado com sucesso!');
                })
                ->visible(fn () => $this->record->status === 'pending'),
            Actions\Action::make('reject')
                ->label('Rejeitar')
                ->icon('heroicon-o-x-circle')
                ->color('danger')
                ->requiresConfirmation()
                ->modalHeading('Rejeitar Ponto')
                ->modalDescription('Tem certeza que deseja rejeitar este registro de ponto?')
                ->action(function () {
                    $this->record->update([
                        'status' => 'rejected',
                        'approved_by' => auth()->id(),
                        'approved_at' => now(),
                    ]);
                    
                    $this->notify('success', 'Ponto rejeitado!');
                })
                ->visible(fn () => $this->record->status === 'pending'),
        ];
    }
}