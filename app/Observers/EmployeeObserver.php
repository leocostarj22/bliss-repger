<?php

namespace App\Observers;

use App\Models\Employee;
use App\Models\User;
use Filament\Notifications\Notification;

class EmployeeObserver
{
    /**
     * Handle the Employee "created" event.
     */
    public function created(Employee $employee): void
    {
        // Notificar administradores e gestores de RH da empresa
        $companyId = $employee->company_id;
        if ($companyId) {
            $managers = User::where('company_id', $companyId)
                ->where(function ($query) {
                    $query->where('role', 'admin')
                          ->orWhere('role', 'manager');
                })
                ->get();

            foreach ($managers as $manager) {
                Notification::make()
                    ->title('Novo Funcionário Cadastrado!')
                    ->success()
                    ->body("Funcionário {$employee->name} foi cadastrado com sucesso.")
                    ->sendToDatabase($manager);
            }
        }

        // Notificar o próprio funcionário se ele tiver acesso ao sistema
        if ($employee->user) {
            Notification::make()
                ->title('Bem-vindo!')
                ->success()
                ->body('Seu cadastro foi realizado com sucesso. Bem-vindo à equipe!')
                ->sendToDatabase($employee->user);
        }
    }

    /**
     * Handle the Employee "updated" event.
     */
    public function updated(Employee $employee): void
    {
        // Notificar o funcionário sobre atualizações em seus dados
        if ($employee->user) {
            Notification::make()
                ->title('Dados Atualizados!')
                ->info()
                ->body('Seus dados foram atualizados no sistema.')
                ->sendToDatabase($employee->user);
        }

        // Notificar gestores de RH sobre mudanças importantes
        $companyId = $employee->company_id;
        if ($companyId) {
            $hrManagers = User::where('company_id', $companyId)
                ->where('role', 'manager')
                ->whereHas('department', function ($query) {
                    $query->whereRaw('LOWER(name) = ?', ['recursos humanos']);
                })
                ->get();

            foreach ($hrManagers as $manager) {
                Notification::make()
                    ->title('Funcionário Atualizado!')
                    ->info()
                    ->body("Dados do funcionário {$employee->name} foram atualizados.")
                    ->sendToDatabase($manager);
            }
        }
    }

    /**
     * Handle the Employee "deleted" event.
     */
    public function deleted(Employee $employee): void
    {
        // Notificar administradores sobre a remoção
        $companyId = $employee->company_id;
        if ($companyId) {
            $admins = User::where('company_id', $companyId)
                ->where('role', 'admin')
                ->get();

            foreach ($admins as $admin) {
                Notification::make()
                    ->title('Funcionário Removido!')
                    ->warning()
                    ->body("Funcionário {$employee->name} foi removido do sistema.")
                    ->sendToDatabase($admin);
            }
        }
    }

    /**
     * Handle the Employee "restored" event.
     */
    public function restored(Employee $employee): void
    {
        //
    }

    /**
     * Handle the Employee "force deleted" event.
     */
    public function forceDeleted(Employee $employee): void
    {
        //
    }
}