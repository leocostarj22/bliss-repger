<?php

namespace App\Notifications;

use App\Models\InternalMessage;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Filament\Notifications\Actions\Action;
use Filament\Notifications\Notification as FilamentNotification;

class MessageUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public InternalMessage $message,
        public array $changes,
        public User $updatedBy,
        public bool $isUpdater = false
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->isUpdater 
            ? 'Mensagem Atualizada com Sucesso'
            : 'Mensagem Interna Atualizada';

        $greeting = $this->isUpdater 
            ? 'Sua mensagem foi atualizada com sucesso!'
            : 'Uma mensagem que você recebeu foi atualizada!';

        $mail = (new MailMessage)
            ->subject($subject)
            ->greeting("Olá, {$notifiable->name}!")
            ->line($greeting)
            ->line("**Assunto:** {$this->message->subject}")
            ->line("**Atualizada por:** {$this->updatedBy->name}")
            ->line("**Prioridade:** {$this->message->priority_label}");

        // Adicionar alterações se houver
        if (!empty($this->changes)) {
            $mail->line("**Alterações realizadas:**");
            foreach ($this->changes as $field => $change) {
                $fieldName = $this->getFieldLabel($field);
                $oldValue = $this->formatFieldValue($field, $change['old'] ?? 'N/A');
                $newValue = $this->formatFieldValue($field, $change['new'] ?? 'N/A');
                $mail->line("• **{$fieldName}:** {$oldValue} → {$newValue}");
            }
        }

        return $mail
            ->line("**Mensagem atual:**")
            ->line($this->message->body)
            ->action('Ver Mensagem', url('/admin/internal-messages/' . $this->message->id))
            ->line('Obrigado por usar nosso sistema!');
    }

    public function toDatabase(object $notifiable): array
    {
        $title = $this->isUpdater ? 'Mensagem Atualizada!' : 'Mensagem Atualizada!';
        $body = $this->isUpdater 
            ? 'Sua mensagem foi atualizada com sucesso'
            : 'Uma mensagem que você recebeu foi atualizada';

        return [
            'title' => $title,
            'body' => $body,
            'icon' => 'heroicon-o-pencil-square',
            'color' => $this->isUpdater ? 'success' : 'info',
            'actions' => [
                [
                    'label' => 'Ver Mensagem',
                    'url' => '/admin/internal-messages/' . $this->message->id,
                    'color' => 'primary'
                ]
            ],
            'data' => [
                'message_id' => $this->message->id,
                'subject' => $this->message->subject,
                'updated_by' => $this->updatedBy->name,
                'priority' => $this->message->priority,
                'changes' => $this->changes,
                'is_updater' => $this->isUpdater
            ]
        ];
    }

    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }

    private function getFieldLabel(string $field): string
    {
        return match($field) {
            'subject' => 'Assunto',
            'body' => 'Mensagem',
            'priority' => 'Prioridade',
            'status' => 'Status',
            'is_broadcast' => 'Transmissão',
            default => ucfirst($field)
        };
    }

    private function formatFieldValue(string $field, mixed $value): string
    {
        if (is_null($value)) {
            return 'N/A';
        }

        return match($field) {
            'priority' => match($value) {
                'low' => 'Baixa',
                'normal' => 'Normal', 
                'high' => 'Alta',
                'urgent' => 'Urgente',
                default => $value
            },
            'status' => match($value) {
                'draft' => 'Rascunho',
                'sent' => 'Enviada',
                'archived' => 'Arquivada',
                default => $value
            },
            'is_broadcast' => $value ? 'Sim' : 'Não',
            'body' => strlen($value) > 100 ? substr($value, 0, 100) . '...' : $value,
            default => (string) $value
        };
    }
}