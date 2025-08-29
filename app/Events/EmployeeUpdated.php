<?php

namespace App\Events;

use App\Models\Employee;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class EmployeeUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Employee $employee,
        public array $changes
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->employee->company_id),
            new PrivateChannel('department.' . $this->employee->department_id),
            new PrivateChannel('employee.' . $this->employee->id),
            new PrivateChannel('hr.employees'),
        ];
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'employee' => [
                'id' => $this->employee->id,
                'name' => $this->employee->name,
                'position' => $this->employee->position,
                'department' => $this->employee->department?->name,
                'status' => $this->employee->status,
            ],
            'changes' => $this->changes,
            'message' => 'Dados do funcionário ' . $this->employee->name . ' foram atualizados',
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'employee.updated';
    }
}