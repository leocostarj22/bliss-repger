<?php

namespace App\Observers;

use App\Models\Timesheet;
use App\Models\User;
use Filament\Notifications\Notification;

class TimesheetObserver
{
    /**
     * Handle the Timesheet "created" event.
     */
    public function created(Timesheet $timesheet): void
    {
        // Notificar o funcionário sobre o registro de ponto
        if ($timesheet->employee && $timesheet->employee->user) {
            Notification::make()
                ->title('Ponto Registrado!')
                ->success()
                ->body('Seu ponto foi registrado com sucesso.')
                ->sendToDatabase($timesheet->employee->user);
        }

        // Se houver horas extras, notificar supervisores
        if ($timesheet->overtime_hours > 0) {
            $companyId = $timesheet->employee?->company_id;
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
                        ->title('Horas Extras Registradas!')
                        ->warning()
                        ->body("{$timesheet->employee->name} registrou {$timesheet->overtime_hours}h extras em {$timesheet->work_date->format('d/m/Y')}.")
                        ->sendToDatabase($supervisor);
                }
            }
        }
    }

    /**
     * Handle the Timesheet "updated" event.
     */
    public function updated(Timesheet $timesheet): void
    {
        // Notificar o funcionário sobre atualizações no ponto
        if ($timesheet->employee && $timesheet->employee->user) {
            Notification::make()
                ->title('Ponto Atualizado!')
                ->info()
                ->body('Seu registro de ponto foi atualizado.')
                ->sendToDatabase($timesheet->employee->user);
        }

        // Se o status mudou para aprovado, notificar o funcionário
        if ($timesheet->wasChanged('status') && $timesheet->status === 'approved') {
            if ($timesheet->employee && $timesheet->employee->user) {
                Notification::make()
                    ->title('Ponto Aprovado!')
                    ->success()
                    ->body("Seu ponto de {$timesheet->work_date->format('d/m/Y')} foi aprovado.")
                    ->sendToDatabase($timesheet->employee->user);
            }
        }

        // Se foram adicionadas observações do gestor, notificar o funcionário
        if ($timesheet->wasChanged('manager_notes') && !empty($timesheet->manager_notes)) {
            if ($timesheet->employee && $timesheet->employee->user) {
                Notification::make()
                    ->title('Observação Adicionada!')
                    ->info()
                    ->body('Seu gestor adicionou uma observação ao seu ponto.')
                    ->sendToDatabase($timesheet->employee->user);
            }
        }
    }

    /**
     * Handle the Timesheet "deleted" event.
     */
    public function deleted(Timesheet $timesheet): void
    {
        // Notificar o funcionário sobre a remoção do registro
        if ($timesheet->employee && $timesheet->employee->user) {
            Notification::make()
                ->title('Registro de Ponto Removido!')
                ->warning()
                ->body("Seu registro de ponto de {$timesheet->work_date->format('d/m/Y')} foi removido.")
                ->sendToDatabase($timesheet->employee->user);
        }
    }

    /**
     * Handle the Timesheet "restored" event.
     */
    public function restored(Timesheet $timesheet): void
    {
        //
    }

    /**
     * Handle the Timesheet "force deleted" event.
     */
    public function forceDeleted(Timesheet $timesheet): void
    {
        //
    }
}