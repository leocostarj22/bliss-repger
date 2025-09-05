<?php

namespace App\Notifications;

use App\Models\Payroll;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PayrollUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Payroll $payroll,
        public array $changes = [],
        public string $recipientType = 'employee'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $isApproval = in_array('status', array_keys($this->changes)) && $this->payroll->status === 'approved';
        
        $subject = $isApproval 
            ? 'Folha de Pagamento Aprovada'
            : 'Folha de Pagamento Atualizada';
            
        $greeting = $this->recipientType === 'employee'
            ? "Olá {$this->payroll->employee->name}!"
            : "Olá {$notifiable->name}!";
            
        $message = $isApproval
            ? "Sua folha de pagamento referente ao período {$this->payroll->reference_period} foi aprovada!"
            : "Sua folha de pagamento referente ao período {$this->payroll->reference_period} foi atualizada.";

        $mailMessage = (new MailMessage)
            ->subject($subject)
            ->greeting($greeting)
            ->line($message)
            ->line("**Detalhes:**")
            ->line("• Funcionário: {$this->payroll->employee->name}")
            ->line("• Período: {$this->payroll->reference_period}")
            ->line("• Total Líquido: {$this->payroll->formatted_net_total}")
            ->line("• Status: {$this->payroll->status_label}");

        if (!empty($this->changes) && !$isApproval) {
            $mailMessage->line("**Alterações realizadas:**");
            foreach ($this->changes as $field => $change) {
                $fieldName = $this->getFieldLabel($field);
                $mailMessage->line("• {$fieldName}: {$change['old']} → {$change['new']}");
            }
        }

        return $mailMessage
            ->action('Ver Folha de Pagamento', url('/admin/payrolls/' . $this->payroll->id))
            ->line('Obrigado por usar nossa plataforma!');
    }

    public function toArray(object $notifiable): array
    {
        return [
            'payroll_id' => $this->payroll->id,
            'employee_name' => $this->payroll->employee->name,
            'reference_period' => $this->payroll->reference_period,
            'net_total' => $this->payroll->formatted_net_total,
            'status' => $this->payroll->status,
            'changes' => $this->changes,
            'recipient_type' => $this->recipientType,
            'action_url' => url('/admin/payrolls/' . $this->payroll->id)
        ];
    }

    private function getFieldLabel(string $field): string
    {
        return match ($field) {
            'base_salary' => 'Salário Base',
            'overtime_hours' => 'Horas Extra',
            'overtime_amount' => 'Valor Horas Extra',
            'holiday_allowance' => 'Subsídio de Férias',
            'christmas_allowance' => 'Subsídio de Natal',
            'meal_allowance' => 'Subsídio de Alimentação',
            'transport_allowance' => 'Subsídio de Transporte',
            'other_allowances' => 'Outros Subsídios',
            'social_security_employee' => 'Segurança Social (Funcionário)',
            'irs_withholding' => 'Retenção IRS',
            'union_fee' => 'Quota Sindical',
            'other_deductions' => 'Outros Descontos',
            'gross_total' => 'Total Bruto',
            'net_total' => 'Total Líquido',
            'status' => 'Status',
            'notes' => 'Observações',
            default => ucfirst(str_replace('_', ' ', $field))
        };
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