<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReactionsUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $messageRecipientId,
        public array $reactions,
        public array $userIds,
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];
        foreach ($this->userIds as $id) {
            $uid = (int) $id;
            if ($uid > 0) $channels[] = new PrivateChannel('messages.' . $uid);
        }
        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'id' => $this->messageRecipientId,
            'reactions' => $this->reactions,
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.reactions.updated';
    }
}