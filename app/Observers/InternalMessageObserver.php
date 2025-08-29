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
            Notification::make()        
                ->title('Mensagem Criada!')
                ->success()
                ->body('Mensagem Criada com Sucesso')
                ->sendToDatabase(auth()->user());
    }

    /**
     * Handle the InternalMessage "updated" event.
     */
    public function updated(InternalMessage $internalMessage): void
    {
            Notification::make()        
                ->title('Mensagem Alterado!')
                ->success()
                ->body('Mensagem Alterado com Sucesso!')
                ->sendToDatabase(auth()->user());
    }

    /**
     * Handle the InternalMessage "deleted" event.
     */
    public function deleted(InternalMessage $internalMessage): void
    {
            Notification::make()        
                ->title('Mensagem Apagada!')
                ->success()
                ->body('Mensagem Apagada com Sucesso!')
                ->sendToDatabase(auth()->user());
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
