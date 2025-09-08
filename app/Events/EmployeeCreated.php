<?php

namespace App\Events;

use App\Models\Employee;
use Illuminate\Broadcasting\InteractsWithSockets;
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

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('hr.admin'),
            new PrivateChannel('employees.all')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->employee->id,
            'name' => $this->employee->name,
            'email' => $this->employee->email,
            'department' => $this->employee->department,
            'position' => $this->employee->position,
            'created_at' => $this->employee->created_at->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'employee.created';
    }
}
