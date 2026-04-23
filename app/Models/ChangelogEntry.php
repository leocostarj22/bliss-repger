<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChangelogEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'changelog_id',
        'type',
        'description',
        'module',
        'related_blog_post_id',
        'sort_order',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];

    public function changelog(): BelongsTo
    {
        return $this->belongsTo(Changelog::class);
    }

    public function relatedBlogPost(): BelongsTo
    {
        return $this->belongsTo(BlogPost::class, 'related_blog_post_id');
    }
}
