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

class TimesheetClockOut implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Timesheet $timesheet
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->timesheet->company_id),
            new PrivateChannel('employee.' . $this->timesheet->employee_id),
            new PrivateChannel('hr.timesheets'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'timesheet' => [
                'id' => $this->timesheet->id,
                'employee_name' => $this->timesheet->employee?->name,
                'work_date' => $this->timesheet->work_date?->format('d/m/Y'),
                'clock_in' => $this->timesheet->clock_in?->format('H:i'),
                'clock_out' => $this->timesheet->clock_out?->format('H:i'),
                'total_hours' => $this->timesheet->total_hours,
                'overtime_hours' => $this->timesheet->overtime_hours,
                'location' => $this->timesheet->location,
                'status' => $this->timesheet->status,
            ],
            'message' => $this->timesheet->employee?->name . ' registrou saída às ' . $this->timesheet->clock_out?->format('H:i') . ' (' . $this->timesheet->total_hours . 'h trabalhadas)',
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'timesheet.clock.out';
    }
}