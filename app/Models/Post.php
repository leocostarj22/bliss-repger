<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Carbon\Carbon;

class Post extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'content',
        'type',
        'status',
        'priority',
        'featured_image_url',
        'youtube_video_url',
        'attachment_urls',
        'author_id',
        'visible_to_departments',
        'is_pinned',
        'published_at',
        'expires_at',
        'views_count',
        'likes_count',
    ];

    protected $casts = [
        'attachment_urls' => 'array', // Adicionar este cast
        'visible_to_departments' => 'array',
        'is_pinned' => 'boolean',
        'published_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    // Relacionamentos
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function likes(): HasMany
    {
        return $this->hasMany(PostLike::class);
    }

    // Scopes
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
                    ->where('published_at', '<=', now())
                    ->where(function ($q) {
                        $q->whereNull('expires_at')
                          ->orWhere('expires_at', '>', now());
                    });
    }

    public function scopePinned(Builder $query): Builder
    {
        return $query->where('is_pinned', true);
    }

    public function scopeForDepartment(Builder $query, $departmentId): Builder
    {
        return $query->where(function ($q) use ($departmentId) {
            $q->whereNull('visible_to_departments')
              ->orWhereJsonContains('visible_to_departments', $departmentId);
        });
    }

    // Métodos auxiliares
    public function getExcerptAttribute(): string
    {
        return str(strip_tags($this->content))->limit(150);
    }

    public function getYoutubeEmbedUrlAttribute(): ?string
    {
        if (!$this->video_url) return null;
        
        // Converter URL do YouTube para embed
        if (preg_match('/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/', $this->video_url, $matches)) {
            return "https://www.youtube.com/embed/{$matches[1]}";
        }
        
        return null;
    }

    public function incrementViews(): void
    {
        $this->increment('views_count');
    }

    public function isExpired(): bool
    {
        return $this->expires_at && $this->expires_at->isPast();
    }

    public function canBeViewedByDepartment($departmentId): bool
    {
        if (!$this->visible_to_departments) return true;
        
        return in_array($departmentId, $this->visible_to_departments);
    }
}