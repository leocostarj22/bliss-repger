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

class TimesheetUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Timesheet $timesheet,
        public array $changes = []
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('timesheet.employee.' . $this->timesheet->employee_id),
            new PrivateChannel('timesheet.company.' . $this->timesheet->employee->company_id),
            new PrivateChannel('hr.admin')
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
                'start_time' => $this->timesheet->start_time,
                'end_time' => $this->timesheet->end_time,
                'break_time' => $this->timesheet->break_time,
                'overtime_hours' => $this->timesheet->overtime_hours,
                'status' => $this->timesheet->status,
                'manager_notes' => $this->timesheet->manager_notes,
                'updated_at' => $this->timesheet->updated_at->toISOString()
            ],
            'changes' => $this->changes
        ];
    }

    public function broadcastAs(): string
    {
        return 'timesheet.updated';
    }
}