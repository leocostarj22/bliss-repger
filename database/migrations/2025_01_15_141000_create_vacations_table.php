<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vacations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            
            // Período de férias
            $table->date('start_date');
            $table->date('end_date');
            $table->integer('requested_days'); // Dias solicitados
            $table->integer('approved_days')->nullable(); // Dias aprovados
            $table->integer('vacation_year'); // Ano de referência das férias
            
            // Tipo de licença (adaptado para Portugal)
            $table->enum('vacation_type', [
                'annual_leave', // Férias anuais
                'maternity_leave', // Licença de maternidade
                'paternity_leave', // Licença de paternidade
                'sick_leave', // Baixa médica
                'marriage_leave', // Licença de casamento
                'bereavement_leave', // Licença por luto
                'study_leave', // Licença para estudos
                'unpaid_leave', // Licença sem vencimento
                'other' // Outro
            ])->default('annual_leave');
            
            // Status
            $table->enum('status', ['pending', 'approved', 'rejected', 'cancelled'])->default('pending');
            
            // Datas de controle
            $table->timestamp('requested_at');
            $table->timestamp('approved_at')->nullable();
            $table->timestamp('rejected_at')->nullable();
            
            // Observações
            $table->text('employee_notes')->nullable(); // Observações do funcionário
            $table->text('manager_notes')->nullable(); // Observações do gestor
            $table->text('rejection_reason')->nullable(); // Motivo da rejeição
            
            // Auditoria
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('rejected_by')->nullable()->constrained('users')->onDelete('set null');
            
            $table->timestamps();
            
            // Índices
            $table->index(['employee_id', 'vacation_year']);
            $table->index(['company_id', 'start_date', 'end_date']);
            $table->index(['status']);
            $table->index(['vacation_type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vacations');
    }
};