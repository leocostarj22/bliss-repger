<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\HasOne;
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