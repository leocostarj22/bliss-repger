<?php

namespace App\Events;

use App\Models\Vacation;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VacationApproved implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Vacation $vacation
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('vacation.employee.' . $this->vacation->employee_id),
            new PrivateChannel('vacation.company.' . $this->vacation->employee->company_id)
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'vacation' => [
                'id' => $this->vacation->id,
                'employee_id' => $this->vacation->employee_id,
                'employee_name' => $this->vacation->employee->name,
                'start_date' => $this->vacation->start_date->toDateString(),
                'end_date' => $this->vacation->end_date->toDateString(),
                'days_requested' => $this->vacation->days_requested,
                'status' => $this->vacation->status,
                'approved_at' => $this->vacation->updated_at->toISOString()
            ]
        ];
    }

    public function broadcastAs(): string
    {
        return 'vacation.approved';
    }
}