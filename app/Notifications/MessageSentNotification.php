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

class MessageSentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public InternalMessage $message,
        public User $sender,
        public bool $isSender = true
    ) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $subject = $this->isSender 
            ? 'Mensagem Enviada com Sucesso'
            : 'Nova Mensagem Interna Recebida';

        $greeting = $this->isSender 
            ? 'Sua mensagem foi enviada com sucesso!'
            : 'Você recebeu uma nova mensagem interna!';

        $recipientCount = $this->message->recipientUsers()->count();
        $recipientText = $recipientCount === 1 ? '1 destinatário' : "{$recipientCount} destinatários";

        return (new MailMessage)
            ->subject($subject)
            ->greeting("Olá, {$notifiable->name}!")
            ->line($greeting)
            ->line("**Assunto:** {$this->message->subject}")
            ->line("**Remetente:** {$this->sender->name}")
            ->line("**Prioridade:** {$this->message->priority_label}")
            ->when($this->isSender, function ($mail) use ($recipientText) {
                return $mail->line("**Destinatários:** {$recipientText}");
            })
            ->line("**Mensagem:**")
            ->line($this->message->body)
            ->action('Ver Mensagem', url('/admin/internal-messages/' . $this->message->id))
            ->line('Obrigado por usar nosso sistema!');
    }

    public function toDatabase(object $notifiable): array
    {
        $title = $this->isSender ? 'Mensagem Enviada!' : 'Nova Mensagem!';
        $body = $this->isSender 
            ? 'Sua mensagem foi enviada com sucesso'
            : 'Você recebeu uma nova mensagem interna';

        return [
            'title' => $title,
            'body' => $body,
            'icon' => $this->isSender ? 'heroicon-o-paper-airplane' : 'heroicon-o-envelope',
            'color' => $this->isSender ? 'success' : 'info',
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
                'sender_name' => $this->sender->name,
                'priority' => $this->message->priority,
                'is_sender' => $this->isSender
            ]
        ];
    }

    public function toArray(object $notifiable): array
    {
        return $this->toDatabase($notifiable);
    }
}