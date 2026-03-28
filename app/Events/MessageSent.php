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
        $this->message->loadMissing(['recipients:message_id,recipient_id', 'sender:id']);

        $channels = [];
        $senderId = (int) ($this->message->sender_id ?? 0);
        if ($senderId > 0) {
            $channels[] = new PrivateChannel('messages.' . $senderId);
        }

        foreach ($this->message->recipients as $r) {
            $rid = (int) ($r->recipient_id ?? 0);
            if ($rid > 0) {
                $channels[] = new PrivateChannel('messages.' . $rid);
            }
        }

        $channels[] = new PrivateChannel('messages.all');

        return $channels;
    }

    public function broadcastWith(): array
    {
        $this->message->loadMissing(['recipients:message_id,recipient_id']);

        return [
            'message_id' => (string) $this->message->id,
            'sender_id' => (string) ($this->message->sender_id ?? ''),
            'recipient_ids' => $this->message->recipients->map(fn ($r) => (string) ($r->recipient_id ?? ''))->filter()->values()->all(),
            'created_at' => $this->message->created_at?->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
