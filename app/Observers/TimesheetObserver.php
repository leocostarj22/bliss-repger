<?php

namespace App\Observers;

use App\Models\Timesheet;
use App\Events\TimesheetClockIn;
use App\Events\TimesheetClockOut;
use App\Jobs\ProcessHRBroadcast;

class TimesheetObserver
{
    /**
     * Handle the Timesheet "created" event.
     */
    public function created(Timesheet $timesheet): void
    {
        // Se tem clock_in mas não tem clock_out, é um clock-in
        if ($timesheet->clock_in && !$timesheet->clock_out) {
            ProcessHRBroadcast::dispatch(new TimesheetClockIn($timesheet));
        }
    }

    /**
     * Handle the Timesheet "updated" event.
     */
    public function updated(Timesheet $timesheet): void
    {
        // Se clock_out foi adicionado, é um clock-out
        if ($timesheet->wasChanged('clock_out') && $timesheet->clock_out) {
            ProcessHRBroadcast::dispatch(new TimesheetClockOut($timesheet));
        }
    }
}