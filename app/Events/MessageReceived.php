<?php

namespace App\Events;

use App\Models\InternalMessage;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageReceived implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public InternalMessage $message,
        public User $recipient
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('user.' . $this->recipient->id),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'subject' => $this->message->subject,
                'body' => substr($this->message->body, 0, 100) . '...', // Preview
                'priority' => $this->message->priority,
                'sender_id' => $this->message->sender_id,
                'sender_name' => $this->message->sender->name,
                'sent_at' => $this->message->sent_at,
            ],
            'recipient' => [
                'id' => $this->recipient->id,
                'name' => $this->recipient->name,
            ],
            'notification' => [
                'title' => 'Nova Mensagem Recebida',
                'body' => "Você recebeu uma nova mensagem de {$this->message->sender->name}",
                'type' => 'message_received',
                'priority' => $this->message->priority,
                'sound' => true, // Para tocar som de notificação
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.received';
    }
}