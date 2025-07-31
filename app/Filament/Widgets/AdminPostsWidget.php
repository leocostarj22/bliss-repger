<?php

namespace App\Filament\Widgets;

use App\Models\Post;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Auth;

class AdminPostsWidget extends Widget
{
    protected static string $view = 'filament.widgets.admin-posts-widget';
    
    protected int | string | array $columnSpan = 'full';
    
    protected static ?int $sort = 3; // Posicionar após os widgets existentes
    
    public function getPosts()
    {
        $user = Auth::user();
        
        return Post::published()
            ->when($user->department_id, function ($query) use ($user) {
                $query->forDepartment($user->department_id);
            })
            ->with(['author']) // Removida a referência a 'comments'
            ->orderBy('is_pinned', 'desc')
            ->orderBy('published_at', 'desc')
            ->limit(10)
            ->get();
    }
    
    public function likePost($postId)
    {
        $post = Post::findOrFail($postId);
        $user = Auth::user();
        
        $existingLike = $post->likes()->where('user_id', $user->id)->first();
        
        if ($existingLike) {
            $existingLike->delete();
            $post->decrement('likes_count');
        } else {
            $post->likes()->create(['user_id' => $user->id]);
            $post->increment('likes_count');
        }
        
        $this->dispatch('post-liked', postId: $postId);
    }
}