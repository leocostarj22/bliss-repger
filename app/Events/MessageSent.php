<?php

namespace App\Events;

use App\Models\InternalMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public InternalMessage $message
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('messages.' . $this->message->recipient_id),
            new PrivateChannel('messages.all')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'subject' => $this->message->subject,
            'sender' => $this->message->sender->name,
            'sender_id' => $this->message->sender_id,
            'recipient_id' => $this->message->recipient_id,
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
