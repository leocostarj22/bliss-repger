<?php

namespace App\Events;

use App\Models\Post;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostDeleted implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public array $postData
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('posts.company.' . $this->postData['company_id']),
            new PrivateChannel('posts.admin')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'post' => $this->postData
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.deleted';
    }
}