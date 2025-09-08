<?php

namespace App\Jobs;

use App\Events\PostCreated;
use App\Events\PostUpdated;
use App\Events\PostDeleted;
use App\Models\Post;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessPostBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $eventType,
        public ?Post $post = null,
        public array $postData = [],
        public array $changes = []
    ) {}

    public function handle(): void
    {
        match ($this->eventType) {
            'created' => broadcast(new PostCreated($this->post)),
            'updated' => broadcast(new PostUpdated($this->post, $this->changes)),
            'deleted' => broadcast(new PostDeleted($this->postData)),
            default => null
        };
    }
}