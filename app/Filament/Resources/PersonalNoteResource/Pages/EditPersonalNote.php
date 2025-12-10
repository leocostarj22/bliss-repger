<?php

namespace App\Filament\Resources\PersonalNoteResource\Pages;

use App\Filament\Resources\PersonalNoteResource;
use Filament\Resources\Pages\EditRecord;

class EditPersonalNote extends EditRecord
{
    protected static string $resource = PersonalNoteResource::class;

    protected function getHeaderActions(): array
    {
        return [
            \Filament\Actions\DeleteAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}