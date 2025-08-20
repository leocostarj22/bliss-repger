<?php

namespace App\Filament\Employee\Resources\TaskResource\Pages;

use App\Filament\Employee\Resources\TaskResource;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateTask extends CreateRecord
{
    protected static string $resource = TaskResource::class;
    
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $user = Auth::user();
        $data['taskable_type'] = get_class($user);
        $data['taskable_id'] = $user->id;
        
        return $data;
    }
    
    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}
