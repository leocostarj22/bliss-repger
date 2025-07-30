<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
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
        'is_active',
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
}