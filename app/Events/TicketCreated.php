<?php

namespace App\Events;

use App\Models\Ticket;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TicketCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tickets.admin'),
            new PrivateChannel('tickets.user.' . $this->ticket->user_id)
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->ticket->id,
            'title' => $this->ticket->title,
            'priority' => $this->ticket->priority,
            'status' => $this->ticket->status,
            'user_id' => $this->ticket->user_id,
            'user_name' => $this->ticket->user->name,
            'created_at' => $this->ticket->created_at->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.created';
    }
}
