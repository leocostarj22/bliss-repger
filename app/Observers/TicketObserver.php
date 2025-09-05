<?php

namespace App\Observers;

use App\Models\Ticket;
use App\Models\User;
use App\Notifications\TicketCreatedNotification;
use App\Notifications\TicketUpdatedNotification;
use Filament\Notifications\Notification;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        // Notificar o criador do ticket (Filament Database)
        if ($ticket->user) {
            Notification::make()
                ->title('Ticket Criado!')
                ->success()
                ->body('Seu ticket foi criado com sucesso')
                ->sendToDatabase($ticket->user);
            
            // Enviar notificação por e-mail para o criador
            $ticket->user->notify(new TicketCreatedNotification($ticket, true));
        }

        // Notificar o usuário atribuído (se houver)
        if ($ticket->assignedTo && $ticket->assignedTo->id !== $ticket->user?->id) {
            Notification::make()
                ->title('Novo Ticket Atribuído!')
                ->info()
                ->body("Um novo ticket foi atribuído a você: {$ticket->title}")
                ->sendToDatabase($ticket->assignedTo);
            
            // Enviar notificação por e-mail para o responsável
            $ticket->assignedTo->notify(new TicketCreatedNotification($ticket, false));
        }

        // Notificar administradores/agentes da empresa
        $adminsAndAgents = User::where('company_id', $ticket->company_id)
            ->whereIn('role', ['admin', 'agent', 'manager'])
            ->where('id', '!=', $ticket->user?->id)
            ->where('id', '!=', $ticket->assignedTo?->id)
            ->get();

        foreach ($adminsAndAgents as $user) {
            Notification::make()
                ->title('Novo Ticket Criado!')
                ->info()
                ->body("Novo ticket criado: {$ticket->title}")
                ->sendToDatabase($user);
            
            // Enviar notificação por e-mail para administradores
            $user->notify(new TicketCreatedNotification($ticket, false));
        }
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // Verificar se houve mudanças significativas
        $significantChanges = $this->hasSignificantChanges($ticket);
        
        if (!$significantChanges) {
            return; // Não enviar notificações para mudanças menores
        }
    
        // Obter as mudanças com valores antigos e novos
        $changes = $this->buildChangesArray($ticket);
        $updatedBy = auth()->user() ?? $ticket->user;
    
        // Notificar o criador do ticket (Filament Database)
        if ($ticket->user) {
            Notification::make()
                ->title('Ticket Atualizado!')
                ->warning()
                ->body('Seu ticket foi atualizado')
                ->sendToDatabase($ticket->user);
            
            // Enviar notificação por e-mail para o criador
            $isUpdater = $updatedBy && $updatedBy->id === $ticket->user->id;
            $ticket->user->notify(new TicketUpdatedNotification($ticket, $changes, $updatedBy, $isUpdater));
        }
    
        // Notificar o usuário atribuído (se houver e for diferente do criador)
        if ($ticket->assignedTo && $ticket->assignedTo->id !== $ticket->user?->id) {
            Notification::make()
                ->title('Ticket Atualizado!')
                ->warning()
                ->body("O ticket atribuído a você foi atualizado: {$ticket->title}")
                ->sendToDatabase($ticket->assignedTo);
            
            // Enviar notificação por e-mail para o responsável
            $isUpdater = $updatedBy && $updatedBy->id === $ticket->assignedTo->id;
            $ticket->assignedTo->notify(new TicketUpdatedNotification($ticket, $changes, $updatedBy, $isUpdater));
        }
        
        // Notificar administradores se houve mudança de status ou prioridade
        if ($ticket->wasChanged(['status', 'priority'])) {
            $adminsAndAgents = User::where('company_id', $ticket->company_id)
                ->whereIn('role', ['admin', 'agent', 'manager'])
                ->where('id', '!=', $ticket->user?->id)
                ->where('id', '!=', $ticket->assignedTo?->id)
                ->get();
    
            foreach ($adminsAndAgents as $user) {
                Notification::make()
                    ->title('Ticket Atualizado!')
                    ->warning()
                    ->body("Ticket atualizado: {$ticket->title}")
                    ->sendToDatabase($user);
                
                // Enviar notificação por e-mail para administradores
                $isUpdater = $updatedBy && $updatedBy->id === $user->id;
                $user->notify(new TicketUpdatedNotification($ticket, $changes, $updatedBy, $isUpdater));
            }
        }
    }

    /**
     * Handle the Ticket "deleted" event.
     */
    public function deleted(Ticket $ticket): void
    {
        // Notificar o criador do ticket
        if ($ticket->user) {
            Notification::make()
                ->title('Ticket Removido!')
                ->danger()
                ->body('Seu ticket foi removido')
                ->sendToDatabase($ticket->user);
        }

        // Notificar o usuário atribuído (se houver)
        if ($ticket->assignedTo && $ticket->assignedTo->id !== $ticket->user?->id) {
            Notification::make()
                ->title('Ticket Removido!')
                ->danger()
                ->body("O ticket atribuído a você foi removido: {$ticket->title}")
                ->sendToDatabase($ticket->assignedTo);
        }
    }

    /**
     * Handle the Ticket "restored" event.
     */
    public function restored(Ticket $ticket): void
    {
        //
    }

    /**
     * Handle the Ticket "force deleted" event.
     */
    public function forceDeleted(Ticket $ticket): void
    {
        //
    }
    
    /**
     * Verificar se houve mudanças significativas no ticket
     */
    private function hasSignificantChanges(Ticket $ticket): bool
    {
        $significantFields = [
            'title',
            'description', 
            'status',
            'priority',
            'assigned_to',
            'category_id',
            'due_date'
        ];
        
        return $ticket->wasChanged($significantFields);
    }

    /**
     * Construir array de mudanças com valores antigos e novos
     */
    private function buildChangesArray(Ticket $ticket): array
    {
        $changes = [];
        $dirty = $ticket->getDirty();
        
        foreach ($dirty as $field => $newValue) {
            $oldValue = $ticket->getOriginal($field);
            
            // Formatar valores para exibição
            $changes[$field] = [
                'old' => $this->formatFieldValue($field, $oldValue),
                'new' => $this->formatFieldValue($field, $newValue)
            ];
        }
        
        return $changes;
    }

    /**
     * Formatar valores dos campos para exibição
     */
    private function formatFieldValue(string $field, $value): string
    {
        if (is_null($value)) {
            return 'Não definido';
        }
        
        switch ($field) {
            case 'status':
                return ucfirst($value);
            case 'priority':
                return ucfirst($value);
            case 'assigned_to':
                if ($value) {
                    $user = User::find($value);
                    return $user ? $user->name : 'Usuário #' . $value;
                }
                return 'Não atribuído';
            case 'category_id':
                if ($value) {
                    // Assumindo que existe um modelo Category
                    return 'Categoria #' . $value;
                }
                return 'Sem categoria';
            default:
                return (string) $value;
        }
    }
}
