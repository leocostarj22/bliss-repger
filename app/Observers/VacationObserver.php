<?php

namespace App\Observers;

use App\Models\Vacation;
use App\Models\User;
use Filament\Notifications\Notification;

class VacationObserver
{
    /**
     * Handle the Vacation "created" event.
     */
    public function created(Vacation $vacation): void
    {
        // Notificar o funcionário que criou a solicitação
        if ($vacation->employee && $vacation->employee->user) {
            Notification::make()
                ->title('Solicitação de Férias Criada!')
                ->success()
                ->body('Sua solicitação de férias foi criada e aguarda aprovação.')
                ->sendToDatabase($vacation->employee->user);
        }

        // Notificar supervisores e administradores da empresa
        $companyId = $vacation->employee?->company_id;
        if ($companyId) {
            $supervisors = User::where('company_id', $companyId)
                ->where(function ($query) {
                    $query->where('role', 'admin')
                          ->orWhere('role', 'supervisor')
                          ->orWhere('role', 'manager');
                })
                ->get();

            foreach ($supervisors as $supervisor) {
                Notification::make()
                    ->title('Nova Solicitação de Férias!')
                    ->warning()
                    ->body('Uma nova solicitação de férias foi criada e precisa de aprovação.')
                    ->sendToDatabase($supervisor);
            }
        }
    }

    /**
     * Handle the Vacation "updated" event.
     */
    public function updated(Vacation $vacation): void
    {
        // Notificar o funcionário sobre mudanças no status
        if ($vacation->employee && $vacation->employee->user) {
            $statusMessage = match($vacation->status) {
                'approved' => 'Sua solicitação de férias foi aprovada!',
                'rejected' => 'Sua solicitação de férias foi rejeitada.',
                'pending' => 'Sua solicitação de férias está pendente de aprovação.',
                default => 'Sua solicitação de férias foi atualizada.'
            };

            $notificationType = $vacation->status === 'approved' ? 'success' : 
                              ($vacation->status === 'rejected' ? 'danger' : 'info');

            Notification::make()
                ->title('Solicitação de Férias Atualizada!')
                ->{$notificationType}()
                ->body($statusMessage)
                ->sendToDatabase($vacation->employee->user);
        }

        // Se foi aprovada/rejeitada, notificar também os supervisores
        if (in_array($vacation->status, ['approved', 'rejected'])) {
            $companyId = $vacation->employee?->company_id;
            if ($companyId) {
                $supervisors = User::where('company_id', $companyId)
                    ->where(function ($query) {
                        $query->where('role', 'admin')
                              ->orWhere('role', 'supervisor')
                              ->orWhere('role', 'manager');
                    })
                    ->get();

                foreach ($supervisors as $supervisor) {
                    Notification::make()
                        ->title('Solicitação de Férias Processada!')
                        ->info()
                        ->body("Uma solicitação de férias foi {$vacation->status}.")
                        ->sendToDatabase($supervisor);
                }
            }
        }
    }

    /**
     * Handle the Vacation "deleted" event.
     */
    public function deleted(Vacation $vacation): void
    {
        // Notificar o funcionário sobre a exclusão
        if ($vacation->employee && $vacation->employee->user) {
            Notification::make()
                ->title('Solicitação de Férias Removida!')
                ->warning()
                ->body('Sua solicitação de férias foi removida.')
                ->sendToDatabase($vacation->employee->user);
        }
    }

    /**
     * Handle the Vacation "restored" event.
     */
    public function restored(Vacation $vacation): void
    {
        //
    }

    /**
     * Handle the Vacation "force deleted" event.
     */
    public function forceDeleted(Vacation $vacation): void
    {
        //
    }
}
