<?php

namespace App\Jobs;

use App\Events\PayrollCreated;
use App\Events\PayrollUpdated;
use App\Events\PayrollDeleted;
use App\Models\Payroll;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessPayrollBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $eventType,
        public ?Payroll $payroll = null,
        public array $payrollData = [],
        public array $changes = []
    ) {}

    public function handle(): void
    {
        match ($this->eventType) {
            'created' => broadcast(new PayrollCreated($this->payroll)),
            'updated' => broadcast(new PayrollUpdated($this->payroll, $this->changes)),
            'deleted' => broadcast(new PayrollDeleted($this->payrollData)),
            default => null
        };
    }
}