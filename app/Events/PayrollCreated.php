<?php

namespace App\Events;

use App\Models\Payroll;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PayrollCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Payroll $payroll
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('payroll.employee.' . $this->payroll->employee_id),
            new PrivateChannel('payroll.company.' . $this->payroll->employee->company_id),
            new PrivateChannel('hr.admin')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'payroll' => [
                'id' => $this->payroll->id,
                'employee_id' => $this->payroll->employee_id,
                'employee_name' => $this->payroll->employee->name,
                'reference_period' => $this->payroll->reference_period,
                'gross_total' => $this->payroll->gross_total,
                'net_total' => $this->payroll->net_total,
                'status' => $this->payroll->status,
                'created_at' => $this->payroll->created_at->toISOString()
            ]
        ];
    }

    public function broadcastAs(): string
    {
        return 'payroll.created';
    }
}