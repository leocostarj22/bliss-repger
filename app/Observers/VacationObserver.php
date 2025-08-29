<?php

namespace App\Observers;

use App\Models\Vacation;
use App\Events\VacationRequested;
use App\Events\VacationStatusChanged;
use App\Jobs\ProcessHRBroadcast;

class VacationObserver
{
    /**
     * Handle the Vacation "created" event.
     */
    public function created(Vacation $vacation): void
    {
        ProcessHRBroadcast::dispatch(new VacationRequested($vacation));
    }

    /**
     * Handle the Vacation "updated" event.
     */
    public function updated(Vacation $vacation): void
    {
        // Se o status foi alterado
        if ($vacation->wasChanged('status')) {
            ProcessHRBroadcast::dispatch(new VacationStatusChanged($vacation, $vacation->getOriginal('status')));
        }
    }
}