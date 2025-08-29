<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Notifications\Notifiable;

class MessageRecipient extends Model
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'message_id',
        'recipient_id',
        'type',
        'read_at',
        'is_starred',
        'is_archived',
        'is_deleted',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'is_starred' => 'boolean',
        'is_archived' => 'boolean',
        'is_deleted' => 'boolean',
    ];

    public function message(): BelongsTo
    {
        return $this->belongsTo(InternalMessage::class, 'message_id');
    }

    public function recipient(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recipient_id');
    }

    public function markAsRead(): void
    {
        if (!$this->read_at) {
            $this->update(['read_at' => now()]);
        }
    }

    public function toggleStar(): void
    {
        $this->update(['is_starred' => !$this->is_starred]);
    }
}