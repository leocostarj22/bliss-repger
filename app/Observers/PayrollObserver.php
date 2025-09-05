<?php

namespace App\Observers;

use App\Models\Payroll;
use App\Models\User;
use App\Notifications\PayrollCreatedNotification;
use App\Notifications\PayrollUpdatedNotification;
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
            // Notificação via banco de dados (Filament)
            Notification::make()
                ->title('Folha de Pagamento Gerada!')
                ->info()
                ->body("Sua folha de pagamento de {$payroll->reference_period} foi gerada.")
                ->sendToDatabase($payroll->employee->user);
                
            // Notificação por e-mail
            $payroll->employee->user->notify(new PayrollCreatedNotification($payroll, 'employee'));
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
                // Notificação via banco de dados (Filament)
                Notification::make()
                    ->title('Nova Folha de Pagamento!')
                    ->success()
                    ->body("Folha de pagamento de {$payroll->employee->name} para {$payroll->reference_period} foi gerada.")
                    ->sendToDatabase($manager);
                    
                // Notificação por e-mail
                $manager->notify(new PayrollCreatedNotification($payroll, 'manager'));
            }
        }
    }

    /**
     * Handle the Payroll "updated" event.
     */
    public function updated(Payroll $payroll): void
    {
        // Verificar se houve mudanças significativas
        $significantFields = [
            'base_salary', 'overtime_hours', 'overtime_amount', 'holiday_allowance',
            'christmas_allowance', 'meal_allowance', 'transport_allowance', 'other_allowances',
            'social_security_employee', 'irs_withholding', 'union_fee', 'other_deductions',
            'gross_total', 'net_total', 'status', 'notes'
        ];
        
        $changes = [];
        $hasSignificantChanges = false;
        
        foreach ($significantFields as $field) {
            if ($payroll->wasChanged($field)) {
                $hasSignificantChanges = true;
                $changes[$field] = [
                    'old' => $this->formatFieldValue($field, $payroll->getOriginal($field)),
                    'new' => $this->formatFieldValue($field, $payroll->getAttribute($field))
                ];
            }
        }
        
        if (!$hasSignificantChanges) {
            return;
        }

        // Notificar o funcionário sobre atualizações na folha
        if ($payroll->employee && $payroll->employee->user) {
            $isApproval = $payroll->wasChanged('status') && $payroll->status === 'approved';
            
            $title = $isApproval ? 'Folha de Pagamento Aprovada!' : 'Folha de Pagamento Atualizada!';
            $body = $isApproval 
                ? "Sua folha de pagamento de {$payroll->reference_period} foi aprovada."
                : "Sua folha de pagamento de {$payroll->reference_period} foi atualizada.";
            $type = $isApproval ? 'success' : 'info';
            
            // Notificação via banco de dados (Filament)
            Notification::make()
                ->title($title)
                ->{$type}()
                ->body($body)
                ->sendToDatabase($payroll->employee->user);
                
            // Notificação por e-mail
            $payroll->employee->user->notify(new PayrollUpdatedNotification($payroll, $changes, 'employee'));
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
                    ->body("Folha de pagamento de {$payroll->employee->name} para {$payroll->reference_period} foi removida.")
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
    
    private function formatFieldValue(string $field, mixed $value): string
    {
        if (in_array($field, ['base_salary', 'overtime_amount', 'holiday_allowance', 'christmas_allowance', 
                             'meal_allowance', 'transport_allowance', 'other_allowances', 'social_security_employee',
                             'irs_withholding', 'union_fee', 'other_deductions', 'gross_total', 'net_total'])) {
            return '€ ' . number_format((float)$value, 2, ',', '.');
        }
        
        if ($field === 'status') {
            return match ($value) {
                'draft' => 'Rascunho',
                'approved' => 'Aprovado', 
                'paid' => 'Pago',
                'cancelled' => 'Cancelado',
                default => $value
            };
        }
        
        return (string)$value;
    }
}