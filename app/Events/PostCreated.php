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

class PostCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('posts.company.' . $this->post->company_id),
            new PrivateChannel('posts.admin')
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'post' => [
                'id' => $this->post->id,
                'title' => $this->post->title,
                'content' => $this->post->content,
                'user_id' => $this->post->user_id,
                'user_name' => $this->post->user->name,
                'company_id' => $this->post->company_id,
                'is_published' => $this->post->is_published,
                'is_pinned' => $this->post->is_pinned,
                'created_at' => $this->post->created_at->toISOString()
            ]
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.created';
    }
}