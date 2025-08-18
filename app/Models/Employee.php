<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Employee extends Model
{
    use HasFactory;

    protected $fillable = [
        'employee_code',
        'name', // Nome completo do funcionário
        'email', // Email corporativo
        'nif',
        'document_type',
        'document_number',
        'nis',
        'birth_date',
        'gender',
        'marital_status',
        'phone',
        'emergency_contact',
        'emergency_phone',
        'address',
        'address_number',
        'complement',
        'neighborhood',
        'city',
        'state',
        'zip_code',
        'position',
        'department_id',
        'company_id',
        'hire_date',
        'termination_date',
        'salary',
        'employment_type',
        'status',
        'bank_name',
        'bank_agency',
        'bank_account',
        'account_type',
        'photo_path',
        'documents',
        'notes',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'hire_date' => 'date',
        'termination_date' => 'date',
        'salary' => 'decimal:2',
        'documents' => 'array',
    ];

    /**
     * Boot do modelo para gerar automaticamente o código do funcionário
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($employee) {
            if (empty($employee->employee_code)) {
                $employee->employee_code = static::generateEmployeeCode();
            }
        });
    }

    /**
     * Gera automaticamente o próximo código de funcionário
     */
    public static function generateEmployeeCode(): string
    {
        // Buscar o último código de funcionário
        $lastEmployee = static::orderBy('employee_code', 'desc')->first();
        
        if (!$lastEmployee || !$lastEmployee->employee_code) {
            return 'EMP001';
        }
        
        // Extrair o número do último código (ex: EMP003 -> 3)
        $lastCode = $lastEmployee->employee_code;
        $number = (int) substr($lastCode, 3); // Remove "EMP" e converte para int
        
        // Incrementar e formatar com zeros à esquerda
        $nextNumber = $number + 1;
        
        return 'EMP' . str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
    }

    // Relacionamento opcional com utilizador do sistema
    public function employeeUser(): HasOne
    {
        return $this->hasOne(EmployeeUser::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    // Verifica se o funcionário tem acesso ao sistema
    public function hasSystemAccess(): bool
    {
        return $this->employeeUser && $this->employeeUser->is_active;
    }

    public function getFormattedSalaryAttribute(): string
    {
        return $this->salary ? '€ ' . number_format($this->salary, 2, ',', '.') : '';
    }

    public function getStatusLabelAttribute(): string
    {
        return match ($this->status) {
            'active' => 'Ativo',
            'inactive' => 'Inativo',
            'terminated' => 'Cessado',
            'on_leave' => 'Afastado',
            default => $this->status,
        };
    }
}