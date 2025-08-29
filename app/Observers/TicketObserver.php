<?php

namespace App\Observers;

use App\Models\Ticket;
use App\Jobs\ProcessTicketBroadcast;

class TicketObserver
{
    /**
     * Handle the Ticket "created" event.
     */
    public function created(Ticket $ticket): void
    {
        // Disparar evento quando ticket é criado usando Job assíncrono
        ProcessTicketBroadcast::dispatch($ticket, 'created');
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
        // Verificar se o status foi alterado
        if ($ticket->wasChanged('status')) {
            ProcessTicketBroadcast::dispatch(
                $ticket, 
                'status_changed', 
                $ticket->getOriginal('status')
            );
        }
        
        // Disparar evento geral de atualização
        ProcessTicketBroadcast::dispatch($ticket, 'updated', null, $ticket->getChanges());
    }

    /**
     * Handle the Ticket "deleted" event.
     */
    public function deleted(Ticket $ticket): void
    {
        // Opcional: criar evento TicketDeleted se necessário
        // ProcessTicketBroadcast::dispatch($ticket, 'deleted');
    }
}