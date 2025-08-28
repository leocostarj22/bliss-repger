<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Timesheet extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'company_id',
        'work_date', // Renomeado de date
        'clock_in',
        'lunch_start',
        'lunch_end',
        'clock_out',
        'total_hours',
        'lunch_hours', // Novo campo
        'overtime_hours',
        'expected_hours', // Novo campo
        'status',
        'day_type', // Novo campo
        'ip_address',
        'location',
        'device_info', // Novo campo
        'employee_notes', // Renomeado de notes
        'manager_notes', // Novo campo
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'work_date' => 'date',
        'clock_in' => 'datetime:H:i',
        'clock_out' => 'datetime:H:i',
        'lunch_start' => 'datetime:H:i',
        'lunch_end' => 'datetime:H:i',
        'total_hours' => 'decimal:2',
        'lunch_hours' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'expected_hours' => 'decimal:2',
        'approved_at' => 'datetime',
    ];

    // Relacionamentos
    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Métodos auxiliares
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'present' => 'Presente',
            'absent' => 'Ausente',
            'late' => 'Atraso',
            'early_leave' => 'Saída Antecipada',
            'holiday' => 'Feriado',
            'sick_leave' => 'Baixa Médica',
            'vacation' => 'Férias',
            default => $this->status,
        };
    }

    public function getDayTypeLabelAttribute(): string
    {
        return match ($this->day_type) {
            'workday' => 'Dia de Trabalho',
            'weekend' => 'Fim de Semana',
            'holiday' => 'Feriado',
            'vacation' => 'Férias',
            default => $this->day_type,
        };
    }

    public function getFormattedClockInAttribute(): string
    {
        return $this->clock_in ? $this->clock_in->format('H:i') : '';
    }

    public function getFormattedClockOutAttribute(): string
    {
        return $this->clock_out ? $this->clock_out->format('H:i') : '';
    }

    public function getFormattedLunchStartAttribute(): string
    {
        return $this->lunch_start ? $this->lunch_start->format('H:i') : '';
    }

    public function getFormattedLunchEndAttribute(): string
    {
        return $this->lunch_end ? $this->lunch_end->format('H:i') : '';
    }

    public function getFormattedTotalHoursAttribute(): string
    {
        if (!$this->total_hours) {
            return '0:00';
        }
        
        $hours = floor($this->total_hours);
        $minutes = ($this->total_hours - $hours) * 60;
        
        return sprintf('%d:%02d', $hours, $minutes);
    }

    public function calculateTotalHours(): float
    {
        if (!$this->clock_in || !$this->clock_out) {
            return 0;
        }
        
        $totalMinutes = $this->clock_in->diffInMinutes($this->clock_out);
        
        // Subtrair tempo de almoço se definido
        if ($this->lunch_start && $this->lunch_end) {
            $lunchMinutes = $this->lunch_start->diffInMinutes($this->lunch_end);
            $totalMinutes -= $lunchMinutes;
            $this->lunch_hours = round($lunchMinutes / 60, 2);
        }
        
        return round($totalMinutes / 60, 2);
    }

    public function calculateOvertimeHours(): float
    {
        $standardHours = $this->expected_hours ?: 8.0;
        $totalHours = $this->total_hours ?: $this->calculateTotalHours();
        
        return max(0, $totalHours - $standardHours);
    }

    // Scopes
    public function scopeByEmployee($query, int $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeByDate($query, Carbon $date)
    {
        return $query->whereDate('work_date', $date);
    }

    public function scopeByMonth($query, int $month, int $year)
    {
        return $query->whereMonth('work_date', $month)
                    ->whereYear('work_date', $year);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopeByDayType($query, string $dayType)
    {
        return $query->where('day_type', $dayType);
    }

    // Boot para calcular automaticamente as horas
    protected static function boot()
    {
        parent::boot();
        
        static::saving(function ($timesheet) {
            if ($timesheet->clock_in && $timesheet->clock_out) {
                $timesheet->total_hours = $timesheet->calculateTotalHours();
                $timesheet->overtime_hours = $timesheet->calculateOvertimeHours();
            }
        });
    }
}