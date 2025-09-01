<?php

namespace App\Observers;

use App\Models\InternalMessage;
use Filament\Notifications\Notification;

class InternalMessageObserver
{
    /**
     * Handle the InternalMessage "created" event.
     */
    public function created(InternalMessage $internalMessage): void
    {
        // Notificar o remetente
        if ($internalMessage->sender) {
            Notification::make()
                ->title('Mensagem Enviada!')
                ->success()
                ->body('Sua mensagem foi enviada com sucesso')
                ->sendToDatabase($internalMessage->sender);
        }

        // Notificar todos os destinatários
        $recipients = $internalMessage->recipientUsers;
        foreach ($recipients as $recipient) {
            Notification::make()
                ->title('Nova Mensagem!')
                ->info()
                ->body('Você recebeu uma nova mensagem interna')
                ->sendToDatabase($recipient);
        }
    }

    /**
     * Handle the InternalMessage "updated" event.
     */
    public function updated(InternalMessage $internalMessage): void
    {
        // Notificar o remetente
        if ($internalMessage->sender) {
            Notification::make()
                ->title('Mensagem Atualizada!')
                ->success()
                ->body('Sua mensagem foi atualizada com sucesso')
                ->sendToDatabase($internalMessage->sender);
        }

        // Notificar todos os destinatários
        $recipients = $internalMessage->recipientUsers;
        foreach ($recipients as $recipient) {
            Notification::make()
                ->title('Mensagem Atualizada!')
                ->info()
                ->body('Uma mensagem que você recebeu foi atualizada')
                ->sendToDatabase($recipient);
        }
    }

    /**
     * Handle the InternalMessage "deleted" event.
     */
    public function deleted(InternalMessage $internalMessage): void
    {
        // Notificar apenas o remetente sobre a exclusão
        if ($internalMessage->sender) {
            Notification::make()
                ->title('Mensagem Apagada!')
                ->success()
                ->body('Mensagem apagada com sucesso!')
                ->sendToDatabase($internalMessage->sender);
        }
    }

    /**
     * Handle the InternalMessage "restored" event.
     */
    public function restored(InternalMessage $internalMessage): void
    {
        //
    }

    /**
     * Handle the InternalMessage "force deleted" event.
     */
    public function forceDeleted(InternalMessage $internalMessage): void
    {
        //
    }
}
