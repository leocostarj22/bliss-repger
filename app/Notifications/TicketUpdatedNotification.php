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
    public $updatedById;
    public $updatedByName;
    public $isUpdater;

    public function __construct(Ticket $ticket, array $changes, ?User $updatedBy = null, bool $isUpdater = false)
    {
        $this->ticket = $ticket;
        $this->changes = $changes ?? [];
        
        // Armazenar apenas ID e nome para evitar problemas de serialização
        if ($updatedBy) {
            $this->updatedById = $updatedBy->id;
            $this->updatedByName = $updatedBy->name;
        } else {
            $this->updatedById = null;
            $this->updatedByName = 'Sistema';
        }
        
        $this->isUpdater = $isUpdater;
    }

    public function via($notifiable)
    {
        return ['database', 'mail'];
    }

    public function toMail($notifiable)
    {
        try {
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
                    ->line($changesText ?: 'Nenhuma alteração registrada')
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
                    ->line('• **Atualizado por:** ' . $this->updatedByName)
                    ->line('')
                    ->line('**Alterações Realizadas:**')
                    ->line($changesText ?: 'Nenhuma alteração registrada')
                    ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id))
                    ->line('Obrigado por usar nosso sistema de suporte!');
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao gerar email da TicketUpdatedNotification: ' . $e->getMessage());
            
            // Fallback em caso de erro
            return (new MailMessage)
                ->subject('Ticket Atualizado - #' . $this->ticket->id)
                ->greeting('Olá!')
                ->line('Seu ticket foi atualizado.')
                ->action('Ver Ticket', url('/admin/tickets/' . $this->ticket->id));
        }
    }

    public function toDatabase($notifiable)
    {
        try {
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
                    'message' => "Ticket #{$this->ticket->id} '{$this->ticket->title}' foi atualizado por {$this->updatedByName}. {$changesText}",
                    'ticket_id' => $this->ticket->id,
                    'ticket_title' => $this->ticket->title,
                    'ticket_status' => $this->ticket->status,
                    'ticket_priority' => $this->ticket->priority,
                    'updated_by' => $this->updatedByName,
                    'changes' => $this->changes,
                    'action_url' => url('/admin/tickets/' . $this->ticket->id),
                    'icon' => 'heroicon-o-arrow-path',
                    'color' => 'info'
                ];
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao gerar dados de database da TicketUpdatedNotification: ' . $e->getMessage());
            
            // Fallback em caso de erro
            return [
                'type' => 'ticket_updated',
                'title' => 'Ticket Atualizado',
                'message' => "Ticket #{$this->ticket->id} foi atualizado.",
                'ticket_id' => $this->ticket->id,
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
        if (empty($this->changes)) {
            return '';
        }
        
        $formatted = [];
        
        try {
            foreach ($this->changes as $field => $change) {
                if (is_array($change) && isset($change['old'], $change['new'])) {
                    $fieldName = $this->getFieldDisplayName($field);
                    $oldValue = $change['old'] ?? 'N/A';
                    $newValue = $change['new'] ?? 'N/A';
                    $formatted[] = "• **{$fieldName}:** {$oldValue} → {$newValue}";
                }
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao formatar mudanças para email: ' . $e->getMessage());
            return 'Alterações realizadas';
        }
        
        return implode("\n", $formatted);
    }

    private function formatChangesForDatabase()
    {
        if (empty($this->changes)) {
            return '';
        }
        
        $changes = [];
        
        try {
            foreach ($this->changes as $field => $change) {
                if (is_array($change) && isset($change['old'], $change['new'])) {
                    $fieldName = $this->getFieldDisplayName($field);
                    $oldValue = $change['old'] ?? 'N/A';
                    $newValue = $change['new'] ?? 'N/A';
                    $changes[] = "{$fieldName}: {$oldValue} → {$newValue}";
                }
            }
        } catch (\Exception $e) {
            \Log::error('Erro ao formatar mudanças para database: ' . $e->getMessage());
            return 'Alterações realizadas';
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