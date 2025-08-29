<?php

namespace App\Observers;

use App\Models\InternalMessage;
use App\Events\MessageSent;
use App\Jobs\ProcessMessageBroadcast;

class InternalMessageObserver
{
    /**
     * Handle the InternalMessage "created" event.
     */
    public function created(InternalMessage $message): void
    {
        // Usar job para processar o broadcasting de forma assíncrona
        ProcessMessageBroadcast::dispatch($message, 'sent');
    }

    /**
     * Handle the InternalMessage "updated" event.
     */
    public function updated(InternalMessage $message): void
    {
        // Se a mensagem foi marcada como lida (status changed)
        if ($message->wasChanged('status') && $message->status === 'read') {
            ProcessMessageBroadcast::dispatch($message, 'read');
        }
    }
}