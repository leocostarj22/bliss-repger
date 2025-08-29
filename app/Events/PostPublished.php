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

class PostPublished implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public Post $post
    ) {}

    public function broadcastOn(): array
    {
        $channels = [
            new PrivateChannel('posts.all'),
        ];

        // Adicionar canais específicos por departamento se o post tem visibilidade restrita
        if ($this->post->visible_to_departments && is_array($this->post->visible_to_departments)) {
            foreach ($this->post->visible_to_departments as $departmentId) {
                $channels[] = new PrivateChannel('department.' . $departmentId);
            }
        } else {
            // Se não tem restrição, transmitir para todos os departamentos
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
                'content' => strip_tags($this->post->content), // Remover HTML para preview
                'type' => $this->post->type,
                'priority' => $this->post->priority,
                'author_name' => $this->post->author?->name,
                'is_pinned' => $this->post->is_pinned,
                'published_at' => $this->post->published_at?->format('d/m/Y H:i'),
                'expires_at' => $this->post->expires_at?->format('d/m/Y H:i'),
                'featured_image_url' => $this->post->featured_image_url,
            ],
            'message' => $this->getPublishMessage(),
            'timestamp' => now()->toISOString(),
        ];
    }

    public function broadcastAs(): string
    {
        return 'post.published';
    }

    private function getPublishMessage(): string
    {
        $typeMessages = [
            'announcement' => 'Novo comunicado oficial publicado',
            'text' => 'Novo post publicado',
            'image' => 'Nova imagem publicada',
            'video' => 'Novo vídeo publicado',
        ];

        $baseMessage = $typeMessages[$this->post->type] ?? 'Novo post publicado';
        
        if ($this->post->priority === 'urgent') {
            return '🚨 URGENTE: ' . $baseMessage . ': ' . $this->post->title;
        } elseif ($this->post->priority === 'important') {
            return '⚠️ IMPORTANTE: ' . $baseMessage . ': ' . $this->post->title;
        }
        
        return $baseMessage . ': ' . $this->post->title;
    }
}