<?php

namespace App\Filament\Resources\PersonalNoteResource\Pages;

use App\Filament\Resources\PersonalNoteResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPersonalNotes extends ListRecords
{
    protected static string $resource = PersonalNoteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\CreateAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}