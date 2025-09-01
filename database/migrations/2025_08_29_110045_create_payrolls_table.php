<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payrolls', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained()->onDelete('cascade');
            $table->foreignId('company_id')->constrained()->onDelete('cascade');
            
            // Período de referência
            $table->integer('reference_month'); // 1-12
            $table->integer('reference_year');
            
            // Valores em euros (formato português)
            $table->decimal('base_salary', 10, 2); // Salário base
            $table->decimal('overtime_hours', 8, 2)->default(0); // Horas extras
            $table->decimal('overtime_amount', 10, 2)->default(0); // Valor horas extras
            $table->decimal('holiday_allowance', 10, 2)->default(0); // Subsídio de férias
            $table->decimal('christmas_allowance', 10, 2)->default(0); // Subsídio de Natal
            $table->decimal('meal_allowance', 10, 2)->default(0); // Subsídio de alimentação
            $table->decimal('transport_allowance', 10, 2)->default(0); // Subsídio de transporte
            $table->decimal('other_allowances', 10, 2)->default(0); // Outros subsídios
            
            // Descontos obrigatórios em Portugal
            $table->decimal('social_security_employee', 10, 2)->default(0); // Seg. Social (11%)
            $table->decimal('social_security_employer', 10, 2)->default(0); // Seg. Social empresa (23,75%)
            $table->decimal('irs_withholding', 10, 2)->default(0); // Retenção IRS
            $table->decimal('union_fee', 10, 2)->default(0); // Quota sindical
            $table->decimal('other_deductions', 10, 2)->default(0); // Outros descontos
            
            // Totais
            $table->decimal('gross_total', 10, 2); // Total bruto
            $table->decimal('total_deductions', 10, 2); // Total descontos
            $table->decimal('net_total', 10, 2); // Total líquido
            
            // Status e controle
            $table->enum('status', ['draft', 'approved', 'paid', 'cancelled'])->default('draft');
            $table->string('pdf_path')->nullable(); // Caminho para PDF do holerite
            $table->text('notes')->nullable();
            
            // Auditoria
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->foreignId('approved_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('approved_at')->nullable();
            
            $table->timestamps();
            
            // Índices
            $table->unique(['employee_id', 'reference_month', 'reference_year']);
            $table->index(['company_id', 'reference_year', 'reference_month']);
            $table->index(['status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payrolls');
    }
};