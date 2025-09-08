<?php

namespace App\Events;

use App\Models\Timesheet;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TimesheetApproved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Timesheet $timesheet
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('timesheet.employee.' . $this->timesheet->employee_id),
            new PrivateChannel('timesheet.company.' . $this->timesheet->employee->company_id)
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'timesheet' => [
                'id' => $this->timesheet->id,
                'employee_id' => $this->timesheet->employee_id,
                'employee_name' => $this->timesheet->employee->name,
                'work_date' => $this->timesheet->work_date->toDateString(),
                'status' => $this->timesheet->status,
                'approved_at' => $this->timesheet->updated_at->toISOString()
            ]
        ];
    }

    public function broadcastAs(): string
    {
        return 'timesheet.approved';
    }
}