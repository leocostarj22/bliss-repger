<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Department extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
        'email',
        'company_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    protected static function boot()
    {
        parent::boot();
        
        static::creating(function ($department) {
            if (empty($department->slug)) {
                $baseSlug = Str::slug($department->name);
                $slug = $baseSlug;
                $counter = 1;
                
                // Verifica se já existe um departamento com este slug na mesma empresa
                while (static::where('company_id', $department->company_id)
                                ->where('slug', $slug)
                                ->exists()) {
                    $slug = $baseSlug . '-' . $counter;
                    $counter++;
                }
                
                $department->slug = $slug;
            }
        });
    }

    // Relacionamentos
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForCompany($query, $companyId)
    {
        return $query->where('company_id', $companyId);
    }

    // Métodos auxiliares
    public function getTicketsCount(): int
    {
        return $this->tickets()->count();
    }

    public function getOpenTicketsCount(): int
    {
        return $this->tickets()->where('status', 'open')->count();
    }
}