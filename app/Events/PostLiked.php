<?php

namespace App\Events;

use App\Models\Post;
use App\Models\User;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class PostLiked implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post,
        public User $user,
        public bool $isLiked = true // true para like, false para unlike
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('post.' . $this->post->id),
            new PrivateChannel('user.' . $this->post->author_id), // Notificar o autor
            new PrivateChannel('posts.interactions'),
        ];
    }

    public function broadcastWith(): array
    {
        return [
            'post' => [
                'id' => $this->post->id,
                'title' => $this->post->title,
                'likes_count' => $this->post->likes_count,
                'author_id' => $this->post->author_id,
            ],
            'user' => [
                'id' => $this->user->id,
                'name' => $this->user->name,
            ],
            'is_liked' => $this->isLiked,
            'message' => $this->isLiked 
                ? $this->user->name . ' curtiu o post "' . $this->post->title . '"'
                : $this->user->name . ' descurtiu o post "' . $this->post->title . '"',
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.liked';
    }
}