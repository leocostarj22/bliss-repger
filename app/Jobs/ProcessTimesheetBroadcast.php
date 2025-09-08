<?php

namespace App\Jobs;

use App\Events\TimesheetCreated;
use App\Events\TimesheetUpdated;
use App\Events\TimesheetApproved;
use App\Models\Timesheet;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessTimesheetBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $eventType,
        public Timesheet $timesheet,
        public array $changes = []
    ) {}

    public function handle(): void
    {
        match ($this->eventType) {
            'created' => broadcast(new TimesheetCreated($this->timesheet)),
            'updated' => broadcast(new TimesheetUpdated($this->timesheet, $this->changes)),
            'approved' => broadcast(new TimesheetApproved($this->timesheet)),
            default => null
        };
    }
}