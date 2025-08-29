<?php

namespace App\Observers;

use App\Models\Vacation;
use Filament\Notifications\Notification;

class VacationObserver
{
    /**
     * Handle the Vacation "created" event.
     */
    public function created(Vacation $vacation): void
    {
            Notification::make()
                ->title('Salvo com sucesso!')
                ->success()
                ->body('Sua marcação depende de aprovação.')
                ->sendToDatabase(auth()->user());
    }

    /**
     * Handle the Vacation "updated" event.
     */
    public function updated(Vacation $vacation): void
    {
        //
    }

    /**
     * Handle the Vacation "deleted" event.
     */
    public function deleted(Vacation $vacation): void
    {
        //
    }

    /**
     * Handle the Vacation "restored" event.
     */
    public function restored(Vacation $vacation): void
    {
        //
    }

    /**
     * Handle the Vacation "force deleted" event.
     */
    public function forceDeleted(Vacation $vacation): void
    {
        //
    }
}
