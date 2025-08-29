<?php

namespace App\Events;

use App\Models\InternalMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
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
        $channels = [
            new PrivateChannel('messages'),
            new PrivateChannel('user.' . $this->message->sender_id),
        ];

        // Adicionar canal para cada destinatário
        foreach ($this->message->recipientUsers as $recipient) {
            $channels[] = new PrivateChannel('user.' . $recipient->id);
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'subject' => $this->message->subject,
                'body' => $this->message->body,
                'priority' => $this->message->priority,
                'status' => $this->message->status,
                'sender_id' => $this->message->sender_id,
                'sender_name' => $this->message->sender->name,
                'is_broadcast' => $this->message->is_broadcast,
                'sent_at' => $this->message->sent_at,
                'recipients_count' => $this->message->recipients->count(),
            ],
            'notification' => [
                'title' => 'Nova Mensagem',
                'body' => "Nova mensagem de {$this->message->sender->name}: {$this->message->subject}",
                'type' => 'message',
                'priority' => $this->message->priority,
            ],
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}