<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'priority',
        'status',
        'due_date',
        'start_date',
        'completed_at',
        'is_all_day',
        'location',
        'notes',
        'taskable_type',
        'taskable_id',
        'calendar_event_id',
        'recurrence_rule',
        'is_private',
    ];

    protected $casts = [
        'due_date' => 'datetime',
        'start_date' => 'datetime',
        'completed_at' => 'datetime',
        'is_all_day' => 'boolean',
        'is_private' => 'boolean',
        'recurrence_rule' => 'array',
    ];

    // Relacionamento polimórfico
    public function taskable(): MorphTo
    {
        return $this->morphTo();
    }

    public function sharedWith(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'task_shares', 'task_id', 'user_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    public function scopeOverdue($query)
    {
        return $query->where('due_date', '<', now())
                    ->whereNotIn('status', ['completed', 'cancelled']);
    }

    public function scopeToday($query)
    {
        return $query->whereDate('due_date', today());
    }

    public function scopeThisWeek($query)
    {
        return $query->whereBetween('due_date', [
            now()->startOfWeek(),
            now()->endOfWeek()
        ]);
    }

    // Métodos auxiliares
    public function isOverdue(): bool
    {
        return $this->due_date && 
               $this->due_date->isPast() && 
               !in_array($this->status, ['completed', 'cancelled']);
    }

    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now()
        ]);
    }

    public function getPriorityColorAttribute(): string
    {
        return match($this->priority) {
            'low' => 'success',
            'medium' => 'warning',
            'high' => 'danger',
            'urgent' => 'danger',
            default => 'gray'
        };
    }

    public function getStatusColorAttribute(): string
    {
        return match($this->status) {
            'pending' => 'warning',
            'in_progress' => 'info',
            'completed' => 'success',
            'cancelled' => 'gray',
            default => 'gray'
        };
    }
}