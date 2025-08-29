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

class EmployeeCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Employee $employee
    ) {}

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->employee->company_id),
            new PrivateChannel('department.' . $this->employee->department_id),
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
                'hire_date' => $this->employee->hire_date?->format('Y-m-d'),
                'status' => $this->employee->status,
            ],
            'message' => 'Novo funcionário cadastrado: ' . $this->employee->name,
            'timestamp' => now()->toISOString(),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'employee.created';
    }
}