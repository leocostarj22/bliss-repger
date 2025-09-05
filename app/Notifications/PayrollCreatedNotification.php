<?php

namespace App\Notifications;

use App\Models\Payroll;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PayrollCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Payroll $payroll,
        public string $recipientType = 'employee' // 'employee' ou 'manager'
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->recipientType === 'employee' 
            ? 'Folha de Pagamento Gerada'
            : 'Nova Folha de Pagamento Criada';
            
        $greeting = $this->recipientType === 'employee'
            ? "Olá {$this->payroll->employee->name}!"
            : "Olá {$notifiable->name}!";
            
        $message = $this->recipientType === 'employee'
            ? "Sua folha de pagamento referente ao período {$this->payroll->reference_period} foi gerada com sucesso."
            : "Uma nova folha de pagamento foi criada para {$this->payroll->employee->name} referente ao período {$this->payroll->reference_period}.";

        return (new MailMessage)
            ->subject($subject)
            ->greeting($greeting)
            ->line($message)
            ->line("**Detalhes:**")
            ->line("• Funcionário: {$this->payroll->employee->name}")
            ->line("• Período: {$this->payroll->reference_period}")
            ->line("• Salário Base: {$this->payroll->formatted_gross_total}")
            ->line("• Total Líquido: {$this->payroll->formatted_net_total}")
            ->line("• Status: {$this->payroll->status_label}")
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
            'recipient_type' => $this->recipientType,
            'action_url' => url('/admin/payrolls/' . $this->payroll->id)
        ];
    }
}