<?php

namespace App\Jobs;

use App\Events\VacationCreated;
use App\Events\VacationUpdated;
use App\Events\VacationApproved;
use App\Events\VacationRejected;
use App\Models\Vacation;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessVacationBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $eventType,
        public Vacation $vacation,
        public array $changes = []
    ) {}

    public function handle(): void
    {
        match ($this->eventType) {
            'created' => broadcast(new VacationCreated($this->vacation)),
            'updated' => broadcast(new VacationUpdated($this->vacation, $this->changes)),
            'approved' => broadcast(new VacationApproved($this->vacation)),
            'rejected' => broadcast(new VacationRejected($this->vacation)),
            default => null
        };
    }
}