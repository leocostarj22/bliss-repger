<?php

namespace App\Observers;

use App\Models\Payroll;
use App\Events\PayrollGenerated;
use App\Events\PayrollApproved;
use App\Jobs\ProcessHRBroadcast;

class PayrollObserver
{
    /**
     * Handle the Payroll "created" event.
     */
    public function created(Payroll $payroll): void
    {
        ProcessHRBroadcast::dispatch(new PayrollGenerated($payroll));
    }

    /**
     * Handle the Payroll "updated" event.
     */
    public function updated(Payroll $payroll): void
    {
        // Se o status foi alterado para aprovado
        if ($payroll->wasChanged('status') && $payroll->status === 'approved') {
            ProcessHRBroadcast::dispatch(new PayrollApproved($payroll));
        }
    }
}