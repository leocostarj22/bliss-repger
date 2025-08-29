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

class PostExpired implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('posts.all'),
            new PrivateChannel('post.' . $this->post->id),
            new PrivateChannel('posts.expired'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'post' => [
                'id' => $this->post->id,
                'title' => $this->post->title,
                'type' => $this->post->type,
                'expires_at' => $this->post->expires_at?->format('d/m/Y H:i'),
                'author_name' => $this->post->author?->name,
            ],
            'message' => 'Post expirado: "' . $this->post->title . '"',
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.expired';
    }
}