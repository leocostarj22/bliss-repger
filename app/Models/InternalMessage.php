<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class InternalMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'subject',
        'body',
        'priority',
        'status',
        'sender_id',
        'is_broadcast',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'is_broadcast' => 'boolean',
    ];

    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(MessageRecipient::class, 'message_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(MessageAttachment::class, 'message_id');
    }

    public function recipientUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'message_recipients', 'message_id', 'recipient_id')
                    ->withPivot(['type', 'read_at', 'is_starred', 'is_archived', 'is_deleted'])
                    ->withTimestamps();
    }

    public function scopeSent($query)
    {
        return $query->where('status', 'sent');
    }

    public function scopeDraft($query)
    {
        return $query->where('status', 'draft');
    }

    public function getPriorityLabelAttribute(): string
    {
        return match($this->priority) {
            'low' => 'Baixa',
            'normal' => 'Normal',
            'high' => 'Alta',
            'urgent' => 'Urgente',
        };
    }

    public function getStatusLabelAttribute(): string
    {
        return match($this->status) {
            'draft' => 'Rascunho',
            'sent' => 'Enviada',
            'archived' => 'Arquivada',
        };
    }
}