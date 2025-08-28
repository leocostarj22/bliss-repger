<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'company_id',
        'reference_month',
        'reference_year',
        'base_salary',
        'overtime_hours',
        'overtime_amount',
        'holiday_allowance', // Subsídio de férias
        'christmas_allowance', // Subsídio de Natal
        'meal_allowance', // Subsídio de alimentação
        'transport_allowance', // Subsídio de transporte
        'other_allowances', // Outros subsídios
        'social_security_employee', // Seg. Social funcionário (11%)
        'social_security_employer', // Seg. Social empresa (23,75%)
        'irs_withholding', // Retenção IRS
        'union_fee', // Quota sindical
        'other_deductions', // Outros descontos
        'gross_total', // Total bruto
        'total_deductions', // Total descontos
        'net_total', // Total líquido
        'status',
        'pdf_path',
        'notes',
        'created_by',
        'approved_by',
        'approved_at',
    ];

    protected $casts = [
        'reference_month' => 'integer',
        'reference_year' => 'integer',
        'base_salary' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_amount' => 'decimal:2',
        'holiday_allowance' => 'decimal:2',
        'christmas_allowance' => 'decimal:2',
        'meal_allowance' => 'decimal:2',
        'transport_allowance' => 'decimal:2',
        'other_allowances' => 'decimal:2',
        'social_security_employee' => 'decimal:2',
        'social_security_employer' => 'decimal:2',
        'irs_withholding' => 'decimal:2',
        'union_fee' => 'decimal:2',
        'other_deductions' => 'decimal:2',
        'gross_total' => 'decimal:2',
        'total_deductions' => 'decimal:2',
        'net_total' => 'decimal:2',
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

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function approvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    // Métodos auxiliares
    public function getFormattedNetTotalAttribute(): string
    {
        return '€ ' . number_format($this->net_total, 2, ',', '.');
    }

    public function getFormattedGrossTotalAttribute(): string
    {
        return '€ ' . number_format($this->gross_total, 2, ',', '.');
    }

    public function getReferenceMonthNameAttribute(): string
    {
        $months = [
            1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
            5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
            9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
        ];
        
        return $months[$this->reference_month] ?? '';
    }

    public function getReferencePeriodAttribute(): string
    {
        return $this->reference_month_name . '/' . $this->reference_year;
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'draft' => 'Rascunho',
            'approved' => 'Aprovado',
            'paid' => 'Pago',
            'cancelled' => 'Cancelado',
            default => $this->status,
        };
    }

    public function getTotalAllowancesAttribute(): float
    {
        return $this->holiday_allowance + $this->christmas_allowance + 
               $this->meal_allowance + $this->transport_allowance + $this->other_allowances;
    }

    public function getTotalEarningsAttribute(): float
    {
        return $this->base_salary + $this->overtime_amount + $this->total_allowances;
    }

    // Scope para filtrar por período
    public function scopeByPeriod($query, int $month, int $year)
    {
        return $query->where('reference_month', $month)
                    ->where('reference_year', $year);
    }

    // Scope para filtrar por funcionário
    public function scopeByEmployee($query, int $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }
}