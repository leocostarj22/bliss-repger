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

class PayrollDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $payrollData
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('payroll.company.' . $this->payrollData['company_id']),
            new PrivateChannel('hr.admin')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'payroll' => $this->payrollData
        ];
    }

    public function broadcastAs(): string
    {
        return 'payroll.deleted';
    }
}