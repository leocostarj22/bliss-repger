<?php

namespace App\Observers;

use App\Models\Post;
use App\Events\PostPublished;
use App\Events\PostUpdated;
use App\Events\PostPinned;
use App\Jobs\ProcessPostBroadcast;
use Carbon\Carbon;

class PostObserver
{
    /**
     * Handle the Post "created" event.
     */
    public function created(Post $post): void
    {
        // Se o post foi criado já publicado
        if ($post->status === 'published' && $post->published_at) {
            ProcessPostBroadcast::dispatch(new PostPublished($post));
        }
    }

    /**
     * Handle the Post "updated" event.
     */
    public function updated(Post $post): void
    {
        // Se o post foi publicado (status changed to published)
        if ($post->wasChanged('status') && $post->status === 'published') {
            ProcessPostBroadcast::dispatch(new PostPublished($post));
        }
        
        // Se o post foi fixado/desfixado
        if ($post->wasChanged('is_pinned')) {
            ProcessPostBroadcast::dispatch(new PostPinned($post, $post->is_pinned));
        }
        
        // Atualização geral do post (se já publicado)
        if ($post->status === 'published' && $post->wasChanged(['title', 'content', 'priority'])) {
            ProcessPostBroadcast::dispatch(new PostUpdated($post, $post->getChanges()));
        }
    }
}