<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class TicketComment extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'comment',
        'is_internal',
        'is_solution',
    ];

    protected $casts = [
        'is_internal' => 'boolean',
        'is_solution' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relacionamentos
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(TicketAttachment::class);
    }

    // Scopes
    public function scopePublic($query)
    {
        return $query->where('is_internal', false);
    }

    public function scopeInternal($query)
    {
        return $query->where('is_internal', true);
    }

    public function scopeSolutions($query)
    {
        return $query->where('is_solution', true);
    }

    public function scopeForTicket($query, $ticketId)
    {
        return $query->where('ticket_id', $ticketId);
    }

    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeRecent($query)
    {
        return $query->orderBy('created_at', 'desc');
    }

    // Métodos auxiliares
    public function isInternal(): bool
    {
        return $this->is_internal;
    }

    public function isSolution(): bool
    {
        return $this->is_solution;
    }

    public function markAsSolution(): void
    {
        // Remove solução de outros comentários do mesmo ticket
        $this->ticket->comments()->where('id', '!=', $this->id)->update(['is_solution' => false]);
        
        // Marca este como solução
        $this->update(['is_solution' => true]);
        
        // Marca o ticket como resolvido se ainda não estiver
        if (!$this->ticket->isResolved()) {
            $this->ticket->markAsResolved();
        }
    }

    public function unmarkAsSolution(): void
    {
        $this->update(['is_solution' => false]);
    }

    public function getFormattedCreatedAtAttribute(): string
    {
        return $this->created_at->format('d/m/Y H:i');
    }

    public function getTimeAgoAttribute(): string
    {
        return $this->created_at->diffForHumans();
    }

    public function hasAttachments(): bool
    {
        return $this->attachments()->exists();
    }

    public function getAttachmentsCount(): int
    {
        return $this->attachments()->count();
    }
}