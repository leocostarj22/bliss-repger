<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('timesheets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            
            // Data e horários
            $table->date('work_date');
            $table->time('clock_in')->nullable(); // Entrada
            $table->time('lunch_start')->nullable(); // Início almoço
            $table->time('lunch_end')->nullable(); // Fim almoço
            $table->time('clock_out')->nullable(); // Saída
            
            // Horas calculadas
            $table->decimal('total_hours', 5, 2)->default(0); // Total horas trabalhadas
            $table->decimal('lunch_hours', 5, 2)->default(0); // Horas de almoço
            $table->decimal('overtime_hours', 5, 2)->default(0); // Horas extras
            $table->decimal('expected_hours', 5, 2)->default(8); // Horas esperadas (padrão 8h)
            
            // Status e tipo
            $table->enum('status', ['present', 'absent', 'late', 'early_leave', 'holiday', 'sick_leave', 'vacation'])->default('present');
            $table->enum('day_type', ['workday', 'weekend', 'holiday', 'vacation'])->default('workday');
            
            // Informações de localização e IP (para controle)
            $table->string('ip_address')->nullable();
            $table->string('location')->nullable(); // Localização GPS
            $table->string('device_info')->nullable(); // Informações do dispositivo
            
            // Observações
            $table->text('employee_notes')->nullable(); // Observações do funcionário
            $table->text('manager_notes')->nullable(); // Observações do gestor
            
            // Auditoria
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->unique(['employee_id', 'work_date']); // Um registo por funcionário por dia
            $table->index(['company_id', 'work_date']);
            $table->index(['status']);
            $table->index(['day_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('timesheets');
    }
};