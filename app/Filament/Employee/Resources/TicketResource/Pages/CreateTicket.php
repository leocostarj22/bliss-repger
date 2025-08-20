<?php

namespace App\Filament\Employee\Resources\TicketResource\Pages;

use App\Filament\Employee\Resources\TicketResource;
use App\Models\EmployeeUser;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Support\Facades\Auth;

class CreateTicket extends CreateRecord
{
    protected static string $resource = TicketResource::class;
    
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        // Garantir que os campos polimórficos sejam definidos corretamente
        $data['user_id'] = Auth::id();
        $data['user_type'] = EmployeeUser::class;
        
        return $data;
    }
}
