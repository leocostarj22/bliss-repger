<?php

namespace App\Observers;

use App\Models\Payroll;
use App\Models\User;
use Filament\Notifications\Notification;

class PayrollObserver
{
    /**
     * Handle the Payroll "created" event.
     */
    public function created(Payroll $payroll): void
    {
        // Notificar o funcionário sobre a geração da folha de pagamento
        if ($payroll->employee && $payroll->employee->user) {
            Notification::make()
                ->title('Folha de Pagamento Gerada!')
                ->info()
                ->body("Sua folha de pagamento de {$payroll->period} foi gerada.")
                ->sendToDatabase($payroll->employee->user);
        }

        // Notificar gestores de RH e administradores
        $companyId = $payroll->employee?->company_id;
        if ($companyId) {
            $managers = User::where('company_id', $companyId)
                ->where(function ($query) {
                    $query->where('role', 'admin')
                          ->orWhere(function ($subQuery) {
                              $subQuery->where('role', 'manager')
                                       ->whereHas('department', function ($deptQuery) {
                                           $deptQuery->whereRaw('LOWER(name) = ?', ['recursos humanos']);
                                       });
                          });
                })
                ->get();

            foreach ($managers as $manager) {
                Notification::make()
                    ->title('Nova Folha de Pagamento!')
                    ->success()
                    ->body("Folha de pagamento de {$payroll->employee->name} para {$payroll->period} foi gerada.")
                    ->sendToDatabase($manager);
            }
        }
    }

    /**
     * Handle the Payroll "updated" event.
     */
    public function updated(Payroll $payroll): void
    {
        // Notificar o funcionário sobre atualizações na folha
        if ($payroll->employee && $payroll->employee->user) {
            Notification::make()
                ->title('Folha de Pagamento Atualizada!')
                ->info()
                ->body("Sua folha de pagamento de {$payroll->period} foi atualizada.")
                ->sendToDatabase($payroll->employee->user);
        }

        // Se o status mudou para aprovado, notificar especialmente
        if ($payroll->wasChanged('status') && $payroll->status === 'approved') {
            if ($payroll->employee && $payroll->employee->user) {
                Notification::make()
                    ->title('Folha de Pagamento Aprovada!')
                    ->success()
                    ->body("Sua folha de pagamento de {$payroll->period} foi aprovada.")
                    ->sendToDatabase($payroll->employee->user);
            }
        }
    }

    /**
     * Handle the Payroll "deleted" event.
     */
    public function deleted(Payroll $payroll): void
    {
        // Notificar gestores de RH sobre a exclusão
        $companyId = $payroll->employee?->company_id;
        if ($companyId) {
            $hrManagers = User::where('company_id', $companyId)
                ->where('role', 'manager')
                ->whereHas('department', function ($query) {
                    $query->whereRaw('LOWER(name) = ?', ['recursos humanos']);
                })
                ->get();

            foreach ($hrManagers as $manager) {
                Notification::make()
                    ->title('Folha de Pagamento Removida!')
                    ->warning()
                    ->body("Folha de pagamento de {$payroll->employee->name} para {$payroll->period} foi removida.")
                    ->sendToDatabase($manager);
            }
        }
    }

    /**
     * Handle the Payroll "restored" event.
     */
    public function restored(Payroll $payroll): void
    {
        //
    }

    /**
     * Handle the Payroll "force deleted" event.
     */
    public function forceDeleted(Payroll $payroll): void
    {
        //
    }
}