<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;

class Changelog extends Model
{
    use HasFactory;

    protected $fillable = [
        'version',
        'title',
        'summary',
        'release_date',
        'is_major',
        'is_published',
        'created_by',
    ];

    protected $casts = [
        'release_date' => 'date',
        'is_major' => 'boolean',
        'is_published' => 'boolean',
    ];

    public function entries(): HasMany
    {
        return $this->hasMany(ChangelogEntry::class)->orderBy('sort_order');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished(Builder $query): Builder
    {
        return $query->where('is_published', true);
    }

    public function scopeMajor(Builder $query): Builder
    {
        return $query->where('is_major', true);
    }
}
