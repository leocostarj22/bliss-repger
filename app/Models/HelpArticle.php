<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class HelpArticle extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'slug',
        'content',
        'excerpt',
        'category',
        'tags',
        'is_published',
        'view_count',
        'helpful_count',
        'not_helpful_count',
        'sort_order',
        'featured',
        'target_audience', // 'admin', 'employee', 'both'
    ];

    protected $casts = [
        'tags' => 'array',
        'is_published' => 'boolean',
        'featured' => 'boolean',
        'view_count' => 'integer',
        'helpful_count' => 'integer',
        'not_helpful_count' => 'integer',
        'sort_order' => 'integer',
    ];

    // Scopes
    public function scopePublished($query)
    {
        return $query->where('is_published', true);
    }

    public function scopeByCategory($query, $category)
    {
        return $query->where('category', $category);
    }

    public function scopeForAudience($query, $audience)
    {
        return $query->where('target_audience', $audience)
                    ->orWhere('target_audience', 'both');
    }

    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    // Mutators
    public function setTitleAttribute($value)
    {
        $this->attributes['title'] = $value;
        $this->attributes['slug'] = Str::slug($value);
    }

    // Accessors
    public function getRouteKeyName()
    {
        return 'slug';
    }

    // Methods
    public function incrementViewCount()
    {
        $this->increment('view_count');
    }

    public function markAsHelpful()
    {
        $this->increment('helpful_count');
    }

    public function markAsNotHelpful()
    {
        $this->increment('not_helpful_count');
    }

    public function getHelpfulPercentageAttribute()
    {
        $total = $this->helpful_count + $this->not_helpful_count;
        if ($total === 0) return 0;
        return round(($this->helpful_count / $total) * 100);
    }
}