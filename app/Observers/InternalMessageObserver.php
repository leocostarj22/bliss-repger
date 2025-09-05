<?php

namespace App\Observers;

use App\Models\InternalMessage;
use App\Notifications\MessageSentNotification;
use App\Notifications\MessageUpdatedNotification;
use Filament\Notifications\Notification;

class InternalMessageObserver
{
    /**
     * Handle the InternalMessage "created" event.
     */
    public function created(InternalMessage $internalMessage): void
    {
        // Notificar o remetente via Filament (banco de dados)
        if ($internalMessage->sender) {
            Notification::make()
                ->title('Mensagem Enviada!')
                ->success()
                ->body('Sua mensagem foi enviada com sucesso')
                ->sendToDatabase($internalMessage->sender);

            // Notificar o remetente via e-mail
            $internalMessage->sender->notify(
                new MessageSentNotification($internalMessage, $internalMessage->sender, true)
            );
        }

        // Notificar todos os destinatários
        $recipients = $internalMessage->recipientUsers;
        foreach ($recipients as $recipient) {
            // Notificação Filament (banco de dados)
            Notification::make()
                ->title('Nova Mensagem!')
                ->info()
                ->body('Você recebeu uma nova mensagem interna')
                ->sendToDatabase($recipient);

            // Notificação por e-mail
            $recipient->notify(
                new MessageSentNotification($internalMessage, $internalMessage->sender, false)
            );
        }
    }

    /**
     * Handle the InternalMessage "updated" event.
     */
    public function updated(InternalMessage $internalMessage): void
    {
        // Verificar se houve mudanças significativas
        $significantFields = ['subject', 'body', 'priority', 'status'];
        $hasSignificantChanges = false;
        
        foreach ($significantFields as $field) {
            if ($internalMessage->isDirty($field)) {
                $hasSignificantChanges = true;
                break;
            }
        }

        if (!$hasSignificantChanges) {
            return;
        }

        // Construir array de mudanças
        $changes = $this->buildChangesArray($internalMessage);
        $updatedBy = auth()->user() ?? $internalMessage->sender;

        // Notificar o remetente
        if ($internalMessage->sender) {
            $isUpdater = $updatedBy->id === $internalMessage->sender->id;
            
            // Notificação Filament (banco de dados)
            Notification::make()
                ->title('Mensagem Atualizada!')
                ->success()
                ->body('Sua mensagem foi atualizada com sucesso')
                ->sendToDatabase($internalMessage->sender);

            // Notificação por e-mail
            $internalMessage->sender->notify(
                new MessageUpdatedNotification($internalMessage, $changes, $updatedBy, $isUpdater)
            );
        }

        // Notificar todos os destinatários
        $recipients = $internalMessage->recipientUsers;
        foreach ($recipients as $recipient) {
            $isUpdater = $updatedBy->id === $recipient->id;
            
            // Notificação Filament (banco de dados)
            Notification::make()
                ->title('Mensagem Atualizada!')
                ->info()
                ->body('Uma mensagem que você recebeu foi atualizada')
                ->sendToDatabase($recipient);

            // Notificação por e-mail
            $recipient->notify(
                new MessageUpdatedNotification($internalMessage, $changes, $updatedBy, $isUpdater)
            );
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

    /**
     * Construir array de mudanças para notificação
     */
    private function buildChangesArray(InternalMessage $message): array
    {
        $changes = [];
        $dirtyFields = $message->getDirty();
        $originalFields = $message->getOriginal();

        foreach ($dirtyFields as $field => $newValue) {
            $oldValue = $originalFields[$field] ?? null;
            
            // Pular campos que não são relevantes para notificação
            if (in_array($field, ['updated_at', 'created_at'])) {
                continue;
            }

            $changes[$field] = [
                'old' => $this->formatFieldValue($field, $oldValue),
                'new' => $this->formatFieldValue($field, $newValue)
            ];
        }

        return $changes;
    }

    /**
     * Formatar valor do campo para exibição
     */
    private function formatFieldValue(string $field, mixed $value): string
    {
        if (is_null($value)) {
            return 'N/A';
        }

        return match($field) {
            'priority' => match($value) {
                'low' => 'Baixa',
                'normal' => 'Normal',
                'high' => 'Alta', 
                'urgent' => 'Urgente',
                default => $value
            },
            'status' => match($value) {
                'draft' => 'Rascunho',
                'sent' => 'Enviada',
                'archived' => 'Arquivada',
                default => $value
            },
            'is_broadcast' => $value ? 'Sim' : 'Não',
            default => (string) $value
        };
    }
}
