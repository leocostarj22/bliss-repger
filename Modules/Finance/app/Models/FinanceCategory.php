<?php

namespace Modules\Finance\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FinanceCategory extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'company_id',
        'parent_id',
        'name',
        'type', // income, expense
        'color',
        'is_active',
    ];

    public function parent(): BelongsTo
    {
        return $this->belongsTo(FinanceCategory::class, 'parent_id');
    }

    public function children(): HasMany
    {
        return $this->hasMany(FinanceCategory::class, 'parent_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(FinanceTransaction::class, 'category_id');
    }
}