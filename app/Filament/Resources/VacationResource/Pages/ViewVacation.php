<?php

namespace App\Filament\Resources\VacationResource\Pages;

use App\Filament\Resources\VacationResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewVacation extends ViewRecord
{
    protected static string $resource = VacationResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make()
                ->label('Editar'),
            Actions\Action::make('approve')
                ->label('Aprovar')
                ->icon('heroicon-o-check')
                ->color('success')
                ->visible(fn () => $this->record->status === 'pending')
                ->requiresConfirmation()
                ->action(function () {
                    $this->record->update([
                        'status' => 'approved',
                        'approved_by' => auth()->id(),
                        'approved_at' => now(),
                    ]);
                }),
            Actions\Action::make('reject')
                ->label('Rejeitar')
                ->icon('heroicon-o-x-mark')
                ->color('danger')
                ->visible(fn () => $this->record->status === 'pending')
                ->form([
                    \Filament\Forms\Components\Textarea::make('rejection_reason')
                        ->label('Motivo da Rejeição')
                        ->required()
                        ->rows(3),
                ])
                ->action(function (array $data) {
                    $this->record->update([
                        'status' => 'rejected',
                        'approved_by' => auth()->id(),
                        'approved_at' => now(),
                        'rejection_reason' => $data['rejection_reason'],
                    ]);
                }),
            Actions\DeleteAction::make()
                ->label('Excluir'),
        ];
    }
}