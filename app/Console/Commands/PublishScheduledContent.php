<?php

namespace App\Console\Commands;

use App\Models\BlogPost;
use App\Models\Post;
use Illuminate\Console\Command;

class PublishScheduledContent extends Command
{
    protected $signature = 'content:publish-scheduled';

    protected $description = 'Publica posts e artigos do blog agendados cujo published_at já passou';

    public function handle(): void
    {
        $blogCount = BlogPost::where('status', 'scheduled')
            ->where('published_at', '<=', now())
            ->update(['status' => 'published']);

        $postCount = Post::where('status', 'scheduled')
            ->where('published_at', '<=', now())
            ->update(['status' => 'published']);

        $total = $blogCount + $postCount;

        if ($total > 0) {
            $this->info("Publicados: {$blogCount} artigo(s) do blog e {$postCount} post(s) interno(s).");
        }
    }
}
