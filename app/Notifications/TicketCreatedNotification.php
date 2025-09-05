<?php

namespace App\Notifications;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TicketCreatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $ticket;
    public $isCreator;

    public function __construct(Ticket $ticket, bool $isCreator = false)
    {
        $this->ticket = $ticket;
        $this->isCreator = $isCreator;
    }

    public function via($notifiable)
    {
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        if ($this->isCreator) {
            return (new MailMessage)
                ->subject('Ticket Criado com Sucesso - #' . $this->ticket->id)
                ->greeting('Olá, ' . $notifiable->name . '!')
                ->line('Seu ticket foi criado com sucesso e está sendo processado.')
                ->line('**Detalhes do Ticket:**')
                ->line('• **ID:** #' . $this->ticket->id)
                ->line('• **Título:** ' . $this->ticket->title)
                ->line('• **Status:** ' . ucfirst($this->ticket->status))
                ->line('• **Prioridade:** ' . ucfirst($this->ticket->priority))
                ->line('• **Categoria:** ' . $this->ticket->category->name ?? 'N/A')
                ->line('Você receberá atualizações sobre o progresso do seu ticket.')
                ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id))
                ->line('Obrigado por usar nosso sistema de suporte!');
        } else {
            return (new MailMessage)
                ->subject('Novo Ticket Criado - #' . $this->ticket->id)
                ->greeting('Olá, ' . $notifiable->name . '!')
                ->line('Um novo ticket foi criado e precisa da sua atenção.')
                ->line('**Detalhes do Ticket:**')
                ->line('• **ID:** #' . $this->ticket->id)
                ->line('• **Título:** ' . $this->ticket->title)
                ->line('• **Cliente:** ' . $this->ticket->user->name)
                ->line('• **Status:** ' . ucfirst($this->ticket->status))
                ->line('• **Prioridade:** ' . ucfirst($this->ticket->priority))
                ->line('• **Categoria:** ' . $this->ticket->category->name ?? 'N/A')
                ->line('• **Criado em:** ' . $this->ticket->created_at->format('d/m/Y H:i'))
                ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id))
                ->line('Por favor, analise e responda o ticket o mais breve possível.');
        }
    }

    public function toDatabase($notifiable)
    {
        if ($this->isCreator) {
            return [
                'type' => 'ticket_created_confirmation',
                'title' => 'Ticket Criado com Sucesso',
                'message' => "Seu ticket #{$this->ticket->id} '{$this->ticket->title}' foi criado com sucesso.",
                'ticket_id' => $this->ticket->id,
                'ticket_title' => $this->ticket->title,
                'ticket_status' => $this->ticket->status,
                'ticket_priority' => $this->ticket->priority,
                'action_url' => url('/admin/tickets/' . $this->ticket->id),
                'icon' => 'heroicon-o-check-circle',
                'color' => 'success'
            ];
        } else {
            return [
                'type' => 'new_ticket_assigned',
                'title' => 'Novo Ticket Criado',
                'message' => "Novo ticket #{$this->ticket->id} '{$this->ticket->title}' criado por {$this->ticket->user->name}.",
                'ticket_id' => $this->ticket->id,
                'ticket_title' => $this->ticket->title,
                'ticket_status' => $this->ticket->status,
                'ticket_priority' => $this->ticket->priority,
                'creator_name' => $this->ticket->user->name,
                'action_url' => url('/admin/tickets/' . $this->ticket->id),
                'icon' => 'heroicon-o-ticket',
                'color' => 'info'
            ];
        }
    }

    public function toArray($notifiable)
    {
        return $this->toDatabase($notifiable);
    }
}