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

class TicketCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Ticket $ticket
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('tickets'),
            new PrivateChannel('user.' . $this->ticket->user_id),
            new PrivateChannel('company.' . $this->ticket->company_id),
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
                'created_at' => $this->ticket->created_at,
            ],
            'message' => 'Novo ticket criado: ' . $this->ticket->title,
        ];
    }

    public function broadcastAs(): string
    {
        return 'ticket.created';
    }
}