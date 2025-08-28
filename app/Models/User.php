<?php

namespace App\Models;

use App\Traits\LogsActivity;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use App\Contracts\UserInterface;

class User extends Authenticatable implements UserInterface
{
    use LogsActivity;
    use HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'company_id',
        'department_id',
        'role_id',
        'role',
        'phone',
        'bio',
        'photo_path', // Adicionar esta linha
        'is_active',
        'last_login_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_active' => 'boolean',
        'last_login_at' => 'datetime',
    ];

    // Relacionamentos
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function roleModel(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'role_id');
    }

    // Relacionamentos para aprovações de RH
    public function approvedVacations(): HasMany
    {
        return $this->hasMany(Vacation::class, 'approved_by');
    }

    public function rejectedVacations(): HasMany
    {
        return $this->hasMany(Vacation::class, 'rejected_by');
    }

    public function approvedTimesheets(): HasMany
    {
        return $this->hasMany(Timesheet::class, 'approved_by');
    }

    // Relacionamento com holerites criados
    public function createdPayrolls(): HasMany
    {
        return $this->hasMany(Payroll::class, 'created_by');
    }

    // Relacionamento com tickets
    public function createdTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'user_id');
    }

    public function assignedTickets(): HasMany
    {
        return $this->hasMany(Ticket::class, 'assigned_to');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(TicketComment::class);
    }

    // Relacionamento com EmployeeUser
    public function employeeUser(): HasOne
    {
        return $this->hasOne(EmployeeUser::class, 'email', 'email');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeByRole($query, $role)
    {
        return $query->where('role', $role);
    }

    public function scopeByCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    // Métodos auxiliares
    public function isAdmin(): bool
    {
        return $this->role === 'admin' || $this->roleModel?->name === 'admin';
    }

    public function isManager(): bool
    {
        return $this->role === 'manager' || $this->roleModel?->name === 'manager';
    }

    public function isAgent(): bool
    {
        return $this->role === 'agent' || $this->roleModel?->name === 'agent';
    }

    public function isCustomer(): bool
    {
        return $this->role === 'customer' || $this->roleModel?->name === 'customer';
    }

    public function isSupervisor(): bool
    {
        return $this->role === 'supervisor' || $this->roleModel?->name === 'supervisor';
    }

    public function hasRole(string $role): bool
    {
        return $this->role === $role || $this->roleModel?->name === $role;
    }

    public function hasPermission(string $permission): bool
    {
        return $this->roleModel?->hasPermission($permission) ?? false;
    }

    public function getRoleDisplayName(): string
    {
        return $this->roleModel?->display_name ?? ucfirst($this->role ?? 'Utilizador');
    }

    public function updateLastLogin(): void
    {
        $this->update(['last_login_at' => now()]);
    }

    /**
     * Método para retornar a URL da foto de perfil para o Filament
     */
    public function getAvatarUrlAttribute()
    {
        if ($this->photo_path) {
            return asset('storage/' . $this->photo_path);
        }
        
        return 'https://ui-avatars.com/api/?name=' . urlencode($this->name);
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
    
    public function getId()
    {
        return $this->id;
    }
    
    public function getEmployee()
    {
        return $this->employee;
    }
}