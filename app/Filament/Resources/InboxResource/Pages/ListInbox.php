<?php

namespace App\Filament\Resources\InboxResource\Pages;

use App\Filament\Resources\InboxResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListInbox extends ListRecords
{
    protected static string $resource = InboxResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\Action::make('compose')
                ->label('Nova Mensagem')
                ->icon('heroicon-o-pencil-square')
                ->color('primary')
                ->url(route('filament.admin.resources.internal-messages.create')),
        ];
    }

    public function getTitle(): string
    {
        return 'Caixa de Entrada';
    }
}