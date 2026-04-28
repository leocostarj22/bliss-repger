<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Role extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'display_name',
        'description',
        'permissions',
        'is_active',
    ];

    protected $casts = [
        'permissions' => 'array',
        'is_active' => 'boolean',
    ];

    // Relacionamentos
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Métodos auxiliares
    public function hasPermission(string $permission): bool
    {
        foreach ($this->permissions ?? [] as $granted) {
            if ($granted === '*') return true;
            if ($granted === $permission) return true;
            if (str_ends_with($granted, '.*') && str_starts_with($permission, substr($granted, 0, -1))) return true;
        }
        return false;
    }

    public function givePermission(string $permission): void
    {
        $permissions = $this->permissions ?? [];
        if (!in_array($permission, $permissions)) {
            $permissions[] = $permission;
            $this->update(['permissions' => $permissions]);
        }
    }

    public function revokePermission(string $permission): void
    {
        $permissions = $this->permissions ?? [];
        $this->update([
            'permissions' => array_values(array_diff($permissions, [$permission]))
        ]);
    }

    // Constantes para cargos padrão
    public const ADMIN = 'admin';
    public const MANAGER = 'manager';
    public const AGENT = 'agent';
    public const CUSTOMER = 'customer';
    public const SUPERVISOR = 'supervisor';
}