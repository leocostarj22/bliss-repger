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

class PostUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post,
        public array $changes = []
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('posts.all'),
            new PrivateChannel('post.' . $this->post->id),
        ];

        // Adicionar canais específicos por departamento se o post tem visibilidade restrita
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
                'content' => strip_tags($this->post->content),
                'type' => $this->post->type,
                'priority' => $this->post->priority,
                'status' => $this->post->status,
                'author_name' => $this->post->author?->name,
                'is_pinned' => $this->post->is_pinned,
                'updated_at' => $this->post->updated_at?->format('d/m/Y H:i'),
            ],
            'changes' => $this->changes,
            'message' => $this->getUpdateMessage(),
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.updated';
    }

    private function getUpdateMessage(): string
    {
        if (isset($this->changes['status'])) {
            $statusMessages = [
                'published' => 'foi publicado',
                'archived' => 'foi arquivado',
                'draft' => 'voltou para rascunho',
            ];
            
            $statusChange = $statusMessages[$this->post->status] ?? 'teve o status alterado';
            return 'Post "' . $this->post->title . '" ' . $statusChange;
        }
        
        if (isset($this->changes['is_pinned'])) {
            $pinnedMessage = $this->post->is_pinned ? 'foi fixado' : 'foi desfixado';
            return 'Post "' . $this->post->title . '" ' . $pinnedMessage;
        }
        
        return 'Post "' . $this->post->title . '" foi atualizado';
    }
}