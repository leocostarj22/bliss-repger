<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Vacation extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_id',
        'company_id',
        'start_date',
        'end_date',
        'requested_days',
        'approved_days',
        'vacation_year',
        'vacation_type', // Novo campo
        'status',
        'requested_at',
        'approved_at',
        'rejected_at',
        'employee_notes', // Renomeado de notes
        'manager_notes', // Novo campo
        'rejection_reason',
        'approved_by',
        'rejected_by',
    ];

    protected $casts = [
        'start_date' => 'date',
        'end_date' => 'date',
        'requested_days' => 'integer',
        'approved_days' => 'integer',
        'vacation_year' => 'integer',
        'requested_at' => 'datetime',
        'approved_at' => 'datetime',
        'rejected_at' => 'datetime',
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

    public function rejectedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rejected_by');
    }

    // Métodos auxiliares
    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'pending' => 'Pendente',
            'approved' => 'Aprovado',
            'rejected' => 'Rejeitado',
            'cancelled' => 'Cancelado',
            default => $this->status,
        };
    }

    public function getVacationTypeLabelAttribute(): string
    {
        return match ($this->vacation_type) {
            'annual_leave' => 'Férias Anuais',
            'maternity_leave' => 'Licença de Maternidade',
            'paternity_leave' => 'Licença de Paternidade',
            'sick_leave' => 'Baixa Médica',
            'marriage_leave' => 'Licença de Casamento',
            'bereavement_leave' => 'Licença por Luto',
            'study_leave' => 'Licença para Estudos',
            'unpaid_leave' => 'Licença Sem Vencimento',
            'other' => 'Outro',
            default => $this->vacation_type,
        };
    }

    public function getDurationInDaysAttribute(): int
    {
        if (!$this->start_date || !$this->end_date) {
            return 0;
        }
        
        return $this->start_date->diffInDays($this->end_date) + 1;
    }

    public function getFormattedPeriodAttribute(): string
    {
        if (!$this->start_date || !$this->end_date) {
            return '';
        }
        
        return $this->start_date->format('d/m/Y') . ' a ' . $this->end_date->format('d/m/Y');
    }

    // Scopes
    public function scopeByEmployee($query, int $employeeId)
    {
        return $query->where('employee_id', $employeeId);
    }

    public function scopeByYear($query, int $year)
    {
        return $query->where('vacation_year', $year);
    }

    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeByType($query, string $type)
    {
        return $query->where('vacation_type', $type);
    }
}