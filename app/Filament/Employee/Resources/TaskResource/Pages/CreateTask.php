<?php

namespace App\Filament\Employee\Resources\TaskResource\Pages;

use App\Filament\Employee\Resources\TaskResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateTask extends CreateRecord
{
    protected static string $resource = TaskResource::class;

    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Associar a tarefa ao funcionário atual
        $employeeUser = Auth::user();
        $data['taskable_type'] = get_class($employeeUser);
        $data['taskable_id'] = $employeeUser->id;
        
        return $data;
    }
}