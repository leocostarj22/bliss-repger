<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class BlogPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'slug',
        'summary',
        'content',
        'cover_image_url',
        'youtube_video_url',
        'category',
        'tags',
        'status',
        'is_featured',
        'reading_time_minutes',
        'views_count',
        'author_id',
        'published_at',
    ];

    protected $casts = [
        'tags' => 'array',
        'is_featured' => 'boolean',
        'published_at' => 'datetime',
        'reading_time_minutes' => 'integer',
        'views_count' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (BlogPost $post) {
            if (empty($post->slug)) {
                $post->slug = Str::slug($post->title);
            }
            if (!empty($post->content)) {
                $wordCount = str_word_count(strip_tags($post->content));
                $post->reading_time_minutes = max(1, (int) ceil($wordCount / 200));
            }
        });
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function changelogEntries(): HasMany
    {
        return $this->hasMany(ChangelogEntry::class, 'related_blog_post_id');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->where(function ($q) {
                $q->whereNull('published_at')->orWhere('published_at', '<=', now());
            });
    }

    public function scopeFeatured(Builder $query): Builder
    {
        return $query->where('is_featured', true);
    }

    public function incrementViews(): void
    {
        $this->increment('views_count');
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        if (!$this->youtube_video_url) return null;

        if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $this->youtube_video_url, $matches)) {
            return "https://www.youtube.com/embed/{$matches[1]}";
        }

        return null;
    }
}
