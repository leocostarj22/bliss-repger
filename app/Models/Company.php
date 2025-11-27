<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'email',
        'phone',
        'address',
        'logo',
        'settings',
        'is_active',
    ];

    protected $casts = [
        'settings' => 'array',
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($company) {
            if (empty($company->slug)) {
                $company->slug = Str::slug($company->name);
            }
        });
    }

    // Relacionamentos
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Métodos auxiliares
    // Método auxiliar atualizado
    public function getLogoUrlAttribute()
    {
        $logo = $this->logo;
        if (empty($logo)) {
            return asset('images/default-company-logo.png');
        }
        if (Str::startsWith($logo, ['http://', 'https://'])) {
            return $logo;
        }
        $path = ltrim($logo, '/');
        try {
            if (Storage::disk('public')->exists($path)) {
                return Storage::disk('public')->url($path);
            }
        } catch (\Throwable $e) {
        }
        if (file_exists(public_path($path))) {
            return asset($path);
        }
        $maybe = 'storage/' . ltrim($path, 'storage/');
        return asset($maybe);
    }
    
    // Método para verificar se tem logo
    public function hasLogo(): bool
    {
        $logo = $this->logo;
        if (empty($logo)) {
            return false;
        }
        $path = ltrim($logo, '/');
        try {
            if (Storage::disk('public')->exists($path)) {
                return true;
            }
        } catch (\Throwable $e) {
        }
        return file_exists(public_path($path)) || file_exists(public_path('storage/' . ltrim($path, 'storage/')));
    }
    
    // Método para deletar logo antigo
    public function deleteLogo(): void
    {
        $logo = $this->logo;
        if (empty($logo)) {
            return;
        }
        $path = ltrim($logo, '/');
        try {
            if (Storage::disk('public')->exists($path)) {
                Storage::disk('public')->delete($path);
                return;
            }
        } catch (\Throwable $e) {
        }
        $abs1 = public_path($path);
        if (file_exists($abs1)) {
            @unlink($abs1);
            return;
        }
        $abs2 = public_path('storage/' . ltrim($path, 'storage/'));
        if (file_exists($abs2)) {
            @unlink($abs2);
        }
    }
}
