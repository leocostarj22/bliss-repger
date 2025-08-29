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

class VacationRequested implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Vacation $vacation
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->vacation->company_id),
            new PrivateChannel('department.' . $this->vacation->employee->department_id),
            new PrivateChannel('hr.vacations'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'vacation' => [
                'id' => $this->vacation->id,
                'employee_name' => $this->vacation->employee?->name,
                'start_date' => $this->vacation->start_date?->format('d/m/Y'),
                'end_date' => $this->vacation->end_date?->format('d/m/Y'),
                'requested_days' => $this->vacation->requested_days,
                'vacation_type' => $this->vacation->vacation_type,
                'status' => $this->vacation->status,
            ],
            'message' => $this->vacation->employee?->name . ' solicitou ' . $this->vacation->requested_days . ' dias de férias',
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'vacation.requested';
    }
}