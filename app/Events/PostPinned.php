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

class PostPinned implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post,
        public bool $isPinned = true
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('posts.all'),
            new PrivateChannel('posts.pinned'),
        ];

        // Adicionar canais específicos por departamento
        if ($this->post->visible_to_departments && is_array($this->post->visible_to_departments)) {
            foreach ($this->post->visible_to_departments as $departmentId) {
                $channels[] = new PrivateChannel('department.' . $departmentId);
            }
        } else {
            $channels[] = new PrivateChannel('posts.public');
        }

        return $channels;
    }

    public function broadcastWith(): array
    {
        return [
            'post' => [
                'id' => $this->post->id,
                'title' => $this->post->title,
                'type' => $this->post->type,
                'priority' => $this->post->priority,
                'is_pinned' => $this->post->is_pinned,
                'author_name' => $this->post->author?->name,
            ],
            'is_pinned' => $this->isPinned,
            'message' => $this->isPinned 
                ? '📌 Post fixado: "' . $this->post->title . '"'
                : '📌 Post desfixado: "' . $this->post->title . '"',
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.pinned';
    }
}