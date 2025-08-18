<?php

namespace App\Filament\Resources\EmployeeResource\Pages;

use App\Filament\Resources\EmployeeResource;
use App\Models\EmployeeUser;
use Filament\Actions;
use Filament\Resources\Pages\CreateRecord;
use Filament\Notifications\Notification;

class CreateEmployee extends CreateRecord
{
    protected static string $resource = EmployeeResource::class;

    protected function getRedirectUrl(): string
    {
        return static::getResource()::getUrl('index');
    }
    
    protected function afterCreate(): void
    {
        $data = $this->form->getState();
        
        // Verificar se foi solicitado criar acesso ao sistema
        if (isset($data['create_system_access']) && $data['create_system_access'] && 
            !empty($data['system_email']) && !empty($data['system_password'])) {
            
            // Criar o usuário do funcionário
            EmployeeUser::create([
                'name' => $this->record->name,
                'email' => $data['system_email'],
                'password' => bcrypt($data['system_password']),
                'employee_id' => $this->record->id,
                'is_active' => true,
            ]);
            
            // Notificação de sucesso
            Notification::make()
                ->title('Acesso ao sistema criado com sucesso!')
                ->body('Email: ' . $data['system_email'] . ' | Senha: ' . $data['system_password'])
                ->success()
                ->persistent()
                ->send();
        }
    }
}
