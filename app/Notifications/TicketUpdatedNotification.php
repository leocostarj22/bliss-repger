<?php

namespace App\Notifications;

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TicketUpdatedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $ticket;
    public $changes;
    public $updatedBy;
    public $isUpdater;

    public function __construct(Ticket $ticket, array $changes, User $updatedBy, bool $isUpdater = false)
    {
        $this->ticket = $ticket;
        $this->changes = $changes;
        $this->updatedBy = $updatedBy;
        $this->isUpdater = $isUpdater;
    }

    public function via($notifiable)
    {
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        $changesText = $this->formatChangesForEmail();
        
        if ($this->isUpdater) {
            return (new MailMessage)
                ->subject('Ticket Atualizado - #' . $this->ticket->id)
                ->greeting('Olá, ' . $notifiable->name . '!')
                ->line('Você atualizou o ticket com sucesso.')
                ->line('**Detalhes do Ticket:**')
                ->line('• **ID:** #' . $this->ticket->id)
                ->line('• **Título:** ' . $this->ticket->title)
                ->line('• **Status Atual:** ' . ucfirst($this->ticket->status))
                ->line('• **Prioridade:** ' . ucfirst($this->ticket->priority))
                ->line('')
                ->line('**Alterações Realizadas:**')
                ->line($changesText)
                ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id))
                ->line('As alterações foram salvas com sucesso.');
        } else {
            return (new MailMessage)
                ->subject('Ticket Atualizado - #' . $this->ticket->id)
                ->greeting('Olá, ' . $notifiable->name . '!')
                ->line('Seu ticket foi atualizado.')
                ->line('**Detalhes do Ticket:**')
                ->line('• **ID:** #' . $this->ticket->id)
                ->line('• **Título:** ' . $this->ticket->title)
                ->line('• **Status Atual:** ' . ucfirst($this->ticket->status))
                ->line('• **Prioridade:** ' . ucfirst($this->ticket->priority))
                ->line('• **Atualizado por:** ' . $this->updatedBy->name)
                ->line('')
                ->line('**Alterações Realizadas:**')
                ->line($changesText)
                ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id))
                ->line('Obrigado por usar nosso sistema de suporte!');
        }
    }

    public function toDatabase($notifiable)
    {
        $changesText = $this->formatChangesForDatabase();
        
        if ($this->isUpdater) {
            return [
                'type' => 'ticket_updated_confirmation',
                'title' => 'Ticket Atualizado',
                'message' => "Você atualizou o ticket #{$this->ticket->id} '{$this->ticket->title}'. {$changesText}",
                'ticket_id' => $this->ticket->id,
                'ticket_title' => $this->ticket->title,
                'ticket_status' => $this->ticket->status,
                'ticket_priority' => $this->ticket->priority,
                'changes' => $this->changes,
                'action_url' => url('/admin/tickets/' . $this->ticket->id),
                'icon' => 'heroicon-o-pencil-square',
                'color' => 'warning'
            ];
        } else {
            return [
                'type' => 'ticket_updated',
                'title' => 'Ticket Atualizado',
                'message' => "Ticket #{$this->ticket->id} '{$this->ticket->title}' foi atualizado por {$this->updatedBy->name}. {$changesText}",
                'ticket_id' => $this->ticket->id,
                'ticket_title' => $this->ticket->title,
                'ticket_status' => $this->ticket->status,
                'ticket_priority' => $this->ticket->priority,
                'updated_by' => $this->updatedBy->name,
                'changes' => $this->changes,
                'action_url' => url('/admin/tickets/' . $this->ticket->id),
                'icon' => 'heroicon-o-arrow-path',
                'color' => 'info'
            ];
        }
    }

    public function toArray($notifiable)
    {
        return $this->toDatabase($notifiable);
    }

    private function formatChangesForEmail()
    {
        $formatted = [];
        
        foreach ($this->changes as $field => $change) {
            $fieldName = $this->getFieldDisplayName($field);
            $formatted[] = "• **{$fieldName}:** {$change['old']} → {$change['new']}";
        }
        
        return implode("\n", $formatted);
    }

    private function formatChangesForDatabase()
    {
        $changes = [];
        
        foreach ($this->changes as $field => $change) {
            $fieldName = $this->getFieldDisplayName($field);
            $changes[] = "{$fieldName}: {$change['old']} → {$change['new']}";
        }
        
        return implode(', ', $changes);
    }

    private function getFieldDisplayName($field)
    {
        $fieldNames = [
            'status' => 'Status',
            'priority' => 'Prioridade',
            'assigned_to' => 'Responsável',
            'title' => 'Título',
            'description' => 'Descrição',
            'category_id' => 'Categoria'
        ];
        
        return $fieldNames[$field] ?? ucfirst($field);
    }
}