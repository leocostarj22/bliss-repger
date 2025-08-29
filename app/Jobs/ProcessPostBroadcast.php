<?php

namespace App\Jobs;

use App\Models\Post;
use App\Events\PostPublished;
use App\Events\PostUpdated;
use App\Events\PostPinned;
use App\Events\PostLiked;
use App\Events\PostExpired;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessPostBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Post $post,
        public string $eventType,
        public ?array $eventData = null
    ) {
        $this->onQueue('broadcasting');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            switch ($this->eventType) {
                case 'published':
                    broadcast(new PostPublished($this->post));
                    break;
                    
                case 'updated':
                    broadcast(new PostUpdated($this->post, $this->eventData ?? []));
                    break;
                    
                case 'pinned':
                    broadcast(new PostPinned($this->post));
                    break;
                    
                case 'liked':
                    $user = $this->eventData['user'] ?? null;
                    if ($user) {
                        broadcast(new PostLiked($this->post, $user));
                    }
                    break;
                    
                case 'expired':
                    broadcast(new PostExpired($this->post));
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar broadcasting de post: ' . $e->getMessage(), [
                'post_id' => $this->post->id,
                'event_type' => $this->eventType,
                'exception' => $e
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessPostBroadcast falhou', [
            'post_id' => $this->post->id,
            'event_type' => $this->eventType,
            'exception' => $exception->getMessage()
        ]);
    }
}