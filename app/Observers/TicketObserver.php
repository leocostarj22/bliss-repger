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
            Notification::make()
                ->title('Saved successfully')
                ->success()
                ->body('Novo Ticket criado.')
                ->sendToDatabase(auth()->user());
    }

    /**
     * Handle the Ticket "updated" event.
     */
    public function updated(Ticket $ticket): void
    {
            Notification::make()        
                ->title('Ticket Alterado com Sucesso!')
                ->success()
                ->body('Ticket Alterado.')
                ->sendToDatabase(auth()->user());
    }

    /**
     * Handle the Ticket "deleted" event.
     */
    public function deleted(Ticket $ticket): void
    {
                Notification::make()
                ->title('Ticket Apagado com Sucesso!')
                ->success()
                ->body('Ticket Apagado.')
                ->sendToDatabase(auth()->user());
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
