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

class VacationStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Vacation $vacation,
        public string $previousStatus
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->vacation->company_id),
            new PrivateChannel('employee.' . $this->vacation->employee_id),
            new PrivateChannel('hr.vacations'),
        ];
    }

    public function broadcastWith(): array
    {
        $statusMessages = [
            'approved' => 'aprovada',
            'rejected' => 'rejeitada',
            'cancelled' => 'cancelada',
        ];

        return [
            'vacation' => [
                'id' => $this->vacation->id,
                'employee_name' => $this->vacation->employee?->name,
                'start_date' => $this->vacation->start_date?->format('d/m/Y'),
                'end_date' => $this->vacation->end_date?->format('d/m/Y'),
                'requested_days' => $this->vacation->requested_days,
                'status' => $this->vacation->status,
                'previous_status' => $this->previousStatus,
            ],
            'message' => 'Solicitação de férias de ' . $this->vacation->employee?->name . ' foi ' . ($statusMessages[$this->vacation->status] ?? $this->vacation->status),
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'vacation.status.changed';
    }
}