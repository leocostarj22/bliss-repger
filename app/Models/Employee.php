<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;

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
        'document_expiration_date', // Novo campo
        'nis',
        'birth_date',
        'gender',
        'nationality',
        'marital_status',
        'spouse_name', // Novo campo
        'spouse_nif', // Novo campo
        'spouse_joint_irs', // Novo campo
        'has_children', // Novo campo
        'children_data', // Novo campo
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
        'hourly_rate', // Novo campo da migration
        'vacation_days_balance', // Novo campo da migration
        'last_vacation_calculation', // Novo campo da migration
        'employment_type',
        'contract_duration', // Novo campo
        'auto_renew', // Novo campo
        'status',
        'bank_name',
        'bank_agency',
        'bank_account',
        'account_type',
        'notes',
        'photo_path',
        'has_disability', // Novo campo
        'disability_declarant', // Novo campo
        'disability_spouse', // Novo campo
        'disability_dependents', // Novo campo
        'documents', // Adicionar se não estiver presente
        'medical_aptitude_date',
        'medical_status',
    ];

    protected $casts = [
        'birth_date' => 'date',
        'hire_date' => 'date',
        'termination_date' => 'date',
        'last_vacation_calculation' => 'date', // Novo cast
        'medical_aptitude_date' => 'date',
        'salary' => 'decimal:2',
        'hourly_rate' => 'decimal:2', // Novo cast
        'vacation_days_balance' => 'integer', // Novo cast
        'documents' => 'array',
        'children_data' => 'array', // Novo cast
        'spouse_joint_irs' => 'boolean', // Novo cast
        'has_children' => 'boolean', // Novo cast
        'document_expiration_date' => 'date', // Novo cast
        'contract_duration' => 'integer', // Novo cast
        'auto_renew' => 'boolean', // Novo cast
        'has_disability' => 'boolean', // Novo cast
        'disability_declarant' => 'boolean', // Novo cast
        'disability_spouse' => 'boolean', // Novo cast
        'disability_dependents' => 'integer', // Novo cast
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

    // Novos relacionamentos para RH
    public function payrolls(): HasMany
    {
        return $this->hasMany(Payroll::class);
    }

    public function vacations(): HasMany
    {
        return $this->hasMany(Vacation::class);
    }

    public function timesheets(): HasMany
    {
        return $this->hasMany(Timesheet::class);
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

    public function getFormattedHourlyRateAttribute(): string
    {
        return $this->hourly_rate ? '€ ' . number_format($this->hourly_rate, 2, ',', '.') : '';
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

    // Método para calcular saldo de férias
    public function updateVacationBalance(): void
    {
        $company = $this->company;
        $annualDays = $company->annual_vacation_days ?? 22; // Padrão Portugal: 22 dias
        
        // Calcular dias proporcionais baseado na data de contratação
        $hireYear = $this->hire_date->year;
        $currentYear = now()->year;
        
        if ($hireYear === $currentYear) {
            // Primeiro ano: proporcional aos meses trabalhados
            $monthsWorked = 12 - $this->hire_date->month + 1;
            $proportionalDays = ($annualDays / 12) * $monthsWorked;
            $this->vacation_days_balance = floor($proportionalDays);
        } else {
            // Anos seguintes: direito completo
            $this->vacation_days_balance = $annualDays;
        }
        
        $this->last_vacation_calculation = now();
        $this->save();
    }
}