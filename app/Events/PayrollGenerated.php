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

class PayrollGenerated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Payroll $payroll
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('company.' . $this->payroll->company_id),
            new PrivateChannel('employee.' . $this->payroll->employee_id),
            new PrivateChannel('hr.payrolls'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'payroll' => [
                'id' => $this->payroll->id,
                'employee_name' => $this->payroll->employee?->name,
                'reference_month' => $this->payroll->reference_month,
                'reference_year' => $this->payroll->reference_year,
                'net_total' => number_format($this->payroll->net_total, 2, ',', '.'),
                'status' => $this->payroll->status,
            ],
            'message' => 'Folha de pagamento gerada para ' . $this->payroll->employee?->name . ' - ' . $this->payroll->reference_month . '/' . $this->payroll->reference_year,
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'payroll.generated';
    }
}