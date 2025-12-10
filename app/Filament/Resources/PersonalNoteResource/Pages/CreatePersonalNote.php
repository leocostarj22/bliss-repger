<?php

namespace App\Filament\Resources\PersonalNoteResource\Pages;

use App\Filament\Resources\PersonalNoteResource;
use Filament\Resources\Pages\CreateRecord;

class CreatePersonalNote extends CreateRecord
{
    protected static string $resource = PersonalNoteResource::class;
    
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['user_id'] = auth()->id();
        return $data;
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}