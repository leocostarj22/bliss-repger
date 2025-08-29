<?php

namespace App\Events;

use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageRead implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public InternalMessage $message,
        public User $reader,
        public MessageRecipient $messageRecipient
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('messages'),
            new PrivateChannel('user.' . $this->message->sender_id),
            new PrivateChannel('user.' . $this->reader->id),
            new PrivateChannel('message.' . $this->message->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'subject' => $this->message->subject,
                'sender_id' => $this->message->sender_id,
                'sender_name' => $this->message->sender->name,
            ],
            'reader' => [
                'id' => $this->reader->id,
                'name' => $this->reader->name,
            ],
            'read_at' => $this->messageRecipient->read_at,
            'notification' => [
                'title' => 'Mensagem Lida',
                'body' => "{$this->reader->name} leu sua mensagem: {$this->message->subject}",
                'type' => 'message_read',
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.read';
    }
}