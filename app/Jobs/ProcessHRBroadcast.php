<?php

namespace App\Jobs;

use App\Events\EmployeeCreated;
use App\Models\Employee;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessHRBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Employee $employee
    ) {}

    public function handle(): void
    {
        broadcast(new EmployeeCreated($this->employee));
    }
}
