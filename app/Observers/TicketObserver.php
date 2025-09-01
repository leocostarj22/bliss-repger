<?php

namespace App\Observers;

use App\Models\Ticket;
use Filament\Notifications\Notification;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        // Notificar o criador do ticket
        if ($ticket->user) {
            Notification::make()
                ->title('Ticket Criado!')
                ->success()
                ->body('Seu ticket foi criado com sucesso')
                ->sendToDatabase($ticket->user);
        }

        // Notificar o usuário atribuído (se houver)
        if ($ticket->assignedTo && $ticket->assignedTo->id !== $ticket->user?->id) {
            Notification::make()
                ->title('Novo Ticket Atribuído!')
                ->info()
                ->body("Um novo ticket foi atribuído a você: {$ticket->title}")
                ->sendToDatabase($ticket->assignedTo);
        }

        // Notificar administradores/agentes da empresa
        $adminsAndAgents = \App\Models\User::where('company_id', $ticket->company_id)
            ->whereIn('role', ['admin', 'agent', 'manager'])
            ->where('id', '!=', $ticket->user?->id)
            ->get();

        foreach ($adminsAndAgents as $user) {
            Notification::make()
                ->title('Novo Ticket Criado!')
                ->info()
                ->body("Novo ticket criado: {$ticket->title}")
                ->sendToDatabase($user);
        }
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // Notificar o criador do ticket
        if ($ticket->user) {
            Notification::make()
                ->title('Ticket Atualizado!')
                ->warning()
                ->body('Seu ticket foi atualizado')
                ->sendToDatabase($ticket->user);
        }

        // Notificar o usuário atribuído (se houver e for diferente do criador)
        if ($ticket->assignedTo && $ticket->assignedTo->id !== $ticket->user?->id) {
            Notification::make()
                ->title('Ticket Atualizado!')
                ->warning()
                ->body("O ticket atribuído a você foi atualizado: {$ticket->title}")
                ->sendToDatabase($ticket->assignedTo);
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
}
