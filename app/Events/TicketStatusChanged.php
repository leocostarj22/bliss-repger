<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public string $oldStatus,
        public string $newStatus
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tickets'),
            new PrivateChannel('user.' . $this->ticket->user_id),
            new PrivateChannel('company.' . $this->ticket->company_id),
            new PrivateChannel('ticket.' . $this->ticket->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'ticket' => [
                'id' => $this->ticket->id,
                'title' => $this->ticket->title,
                'status' => $this->ticket->status,
                'priority' => $this->ticket->priority,
                'user_id' => $this->ticket->user_id,
                'company_id' => $this->ticket->company_id,
            ],
            'old_status' => $this->oldStatus,
            'new_status' => $this->newStatus,
            'message' => "Status do ticket '{$this->ticket->title}' alterado de {$this->oldStatus} para {$this->newStatus}",
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.status.changed';
    }
}