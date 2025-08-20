<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class EmployeeUser extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $table = 'employee_users';

    protected $fillable = [
        'name',
        'email',
        'password',
        'employee_id',
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'is_active' => 'boolean',
        'password' => 'hashed',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    // Método para verificar se o funcionário pode aceder ao sistema
    public function canAccessSystem(): bool
    {
        return $this->is_active && $this->employee && $this->employee->status === 'active';
    }

    // Relacionamentos para tickets
    public function createdTickets(): HasMany
    {
        // EmployeeUser não se relaciona diretamente com Ticket
        // Tickets são relacionados ao User através do user_id
        return $this->hasMany(Ticket::class, 'user_id', 'id');
    }
    
    public function assignedTickets(): HasMany
    {
        // EmployeeUser não se relaciona diretamente com Ticket
        // Tickets são relacionados ao User através do assigned_to
        return $this->hasMany(Ticket::class, 'assigned_to', 'id');
    }
    
    // Método para obter todos os tickets acessíveis (criados ou atribuídos)
    public function accessibleTickets()
    {
        return Ticket::where(function ($query) {
            $query->where('user_id', $this->id)
                  ->orWhere('assigned_to', $this->id);
        })->where('company_id', $this->employee->company_id);
    }
    
    /**
     * Método para retornar a URL da foto de perfil para o Filament
     */
    public function getAvatarUrlAttribute()
    {
        // Primeiro verifica se o funcionário tem uma foto
        if ($this->employee && $this->employee->photo_path) {
            return asset('storage/' . $this->employee->photo_path);
        }
        
        // Fallback para avatar gerado com as iniciais do nome
        return 'https://ui-avatars.com/api/?name=' . urlencode($this->name) . '&background=random';
    }

    /**
     * Método alternativo que o Filament também pode usar
     */
    public function getFilamentAvatarUrl(): ?string
    {
        return $this->avatar_url;
    }

    public function tasks(): MorphMany
    {
        return $this->morphMany(Task::class, 'taskable');
    }
    
    public function pendingTasks()
    {
        return $this->tasks()->pending();
    }
    
    public function completedTasks()
    {
        return $this->tasks()->completed();
    }
    
    public function overdueTasks()
    {
        return $this->tasks()->overdue();
    }
    
    public function todayTasks()
    {
        return $this->tasks()->today();
    }
}