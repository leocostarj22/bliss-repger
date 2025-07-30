<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class Category extends Model
{
    use HasFactory;

    protected $fillable = [
        'company_id',
        'name',
        'description',
        'color',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relacionamentos
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function tickets(): HasMany
    {
        return $this->hasMany(Ticket::class);
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

    public function scopeOrderByName($query)
    {
        return $query->orderBy('name');
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

    public function getInProgressTicketsCount(): int
    {
        return $this->tickets()->where('status', 'in_progress')->count();
    }

    public function getResolvedTicketsCount(): int
    {
        return $this->tickets()->where('status', 'resolved')->count();
    }

    public function getClosedTicketsCount(): int
    {
        return $this->tickets()->where('status', 'closed')->count();
    }

    public function getSlugAttribute(): string
    {
        return Str::slug($this->name);
    }

    public function isActive(): bool
    {
        return $this->is_active;
    }

    public function activate(): void
    {
        $this->update(['is_active' => true]);
    }

    public function deactivate(): void
    {
        $this->update(['is_active' => false]);
    }

    // Cores predefinidas para categorias
    public static function getDefaultColors(): array
    {
        return [
            '#3B82F6', // Azul
            '#10B981', // Verde
            '#F59E0B', // Amarelo
            '#EF4444', // Vermelho
            '#8B5CF6', // Roxo
            '#F97316', // Laranja
            '#06B6D4', // Ciano
            '#84CC16', // Lima
            '#EC4899', // Rosa
            '#6B7280', // Cinza
        ];
    }

    // Método para obter estatísticas da categoria
    public function getStats(): array
    {
        return [
            'total_tickets' => $this->getTicketsCount(),
            'open_tickets' => $this->getOpenTicketsCount(),
            'in_progress_tickets' => $this->getInProgressTicketsCount(),
            'resolved_tickets' => $this->getResolvedTicketsCount(),
            'closed_tickets' => $this->getClosedTicketsCount(),
        ];
    }

    // Método para verificar se a categoria pode ser excluída
    public function canBeDeleted(): bool
    {
        return $this->getTicketsCount() === 0;
    }

    // Boot method para eventos do modelo
    protected static function boot()
    {
        parent::boot();

        // Antes de deletar, verificar se não há tickets associados
        static::deleting(function ($category) {
            if (!$category->canBeDeleted()) {
                throw new \Exception('Não é possível excluir uma categoria que possui tickets associados.');
            }
        });
    }
}
