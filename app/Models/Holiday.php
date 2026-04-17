<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'holiday_date',
        'name',
        'scope',
        'is_optional',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'holiday_date' => 'date',
        'is_optional' => 'boolean',
    ];

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopeByScope($query, string $scope)
    {
        return $query->where('scope', $scope);
    }

    public function scopeByYear($query, int $year)
    {
        return $query->whereBetween('holiday_date', [
            Carbon::create($year, 1, 1)->toDateString(),
            Carbon::create($year, 12, 31)->toDateString(),
        ]);
    }

    public function scopeBetweenDates($query, string $from, string $to)
    {
        return $query->whereBetween('holiday_date', [$from, $to]);
    }
}