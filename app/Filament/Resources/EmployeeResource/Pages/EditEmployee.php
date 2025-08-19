<?php

namespace App\Filament\Resources\EmployeeResource\Pages;

use App\Filament\Resources\EmployeeResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;
use Filament\Notifications\Notification;

class EditEmployee extends EditRecord
{
    protected static string $resource = EmployeeResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\DeleteAction::make(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return static::getResource()::getUrl('index');
    }
    
    protected function mutateFormDataBeforeSave(array $data): array
    {
        // Remover campos que não pertencem à tabela employees
        $fieldsToRemove = ['reset_system_access', 'new_system_password', 'toggle_system_status'];
        
        foreach ($fieldsToRemove as $field) {
            unset($data[$field]);
        }
        
        return $data;
    }
    
    protected function afterSave(): void
    {
        $data = $this->form->getState();
        
        // Processar redefinição de senha
        if (isset($data['reset_system_access']) && $data['reset_system_access'] && 
            !empty($data['new_system_password']) && $this->record->employeeUser) {
            
            $this->record->employeeUser->update([
                'password' => bcrypt($data['new_system_password'])
            ]);
            
            Notification::make()
                ->title('Senha redefinida com sucesso!')
                ->body('Nova senha: ' . $data['new_system_password'])
                ->success()
                ->persistent()
                ->send();
        }
        
        // Processar ativação/desativação do acesso
        if (isset($data['toggle_system_status']) && $this->record->employeeUser) {
            $this->record->employeeUser->update([
                'is_active' => $data['toggle_system_status']
            ]);
            
            $status = $data['toggle_system_status'] ? 'ativado' : 'desativado';
            Notification::make()
                ->title('Acesso ao sistema ' . $status . '!')
                ->success()
                ->send();
        }
    }
}
