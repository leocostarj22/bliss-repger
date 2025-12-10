<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class PersonalNote extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'color',
        'is_favorite',
        'last_modified_by',
    ];

    protected static function booted()
    {
        static::creating(function ($note) {
            if (!$note->user_id && auth()->check()) {
                $note->user_id = auth()->id();
            }
        });

        static::updating(function ($note) {
            if (auth()->check()) {
                $note->last_modified_by = auth()->id();
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function sharedWith(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'personal_note_shares', 'personal_note_id', 'user_id');
    }

    public function lastModifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'last_modified_by');
    }
}