<?php

namespace App\Events;

use App\Models\VideoCall;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class VideoCallJoined implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public VideoCall $videoCall,
        public User $user
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel("video-call.{$this->videoCall->room_id}")
        ];
    }

    public function broadcastAs(): string
    {
        return 'participant.joined';
    }

    public function broadcastWith(): array
    {
        return [
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
                'avatar' => $this->user->avatar_url ?? null,
                'role' => $this->user->role
            ],
            'timestamp' => now()->toISOString()
        ];
    }
}