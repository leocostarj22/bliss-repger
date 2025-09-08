<?php

namespace App\Events;

use App\Models\VideoCall;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VideoCallInitiated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public VideoCall $videoCall,
        public array $participantIds = []
    ) {}

    public function broadcastOn(): array
    {
        $channels = [];
        
        // Canal para cada participante convidado
        foreach ($this->participantIds as $userId) {
            $channels[] = new Channel("user.{$userId}");
        }
        
        // Canal geral da empresa
        $channels[] = new Channel('company.video-calls');
        
        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'video-call.initiated';
    }

    public function broadcastWith(): array
    {
        return [
            'call_id' => $this->videoCall->id,
            'room_id' => $this->videoCall->room_id,
            'title' => $this->videoCall->title,
            'initiator' => [
                'id' => $this->videoCall->initiator->id,
                'name' => $this->videoCall->initiator->name,
                'avatar' => $this->videoCall->initiator->avatar_url ?? null
            ],
            'participants' => $this->participantIds,
            'started_at' => $this->videoCall->started_at?->toISOString()
        ];
    }
}