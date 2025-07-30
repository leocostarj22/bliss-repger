<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('employee_code')->unique();
            $table->string('cpf', 14)->unique();
            $table->string('rg', 20)->nullable();
            $table->date('birth_date')->nullable();
            $table->enum('gender', ['M', 'F', 'Other'])->nullable();
            $table->enum('marital_status', ['single', 'married', 'divorced', 'widowed'])->nullable();
            $table->string('phone', 20)->nullable();
            $table->string('emergency_contact')->nullable();
            $table->string('emergency_phone', 20)->nullable();
            
            // Endereço
            $table->string('address')->nullable();
            $table->string('address_number', 10)->nullable();
            $table->string('complement')->nullable();
            $table->string('neighborhood')->nullable();
            $table->string('city')->nullable();
            $table->string('state', 2)->nullable();
            $table->string('zip_code', 10)->nullable();
            
            // Dados profissionais
            $table->string('position');
            $table->foreignId('department_id')->constrained()->onDelete('restrict');
            $table->foreignId('company_id')->constrained()->onDelete('restrict');
            $table->date('hire_date');
            $table->date('termination_date')->nullable();
            $table->decimal('salary', 10, 2)->nullable();
            $table->enum('employment_type', ['CLT', 'PJ', 'Intern', 'Temporary'])->default('CLT');
            $table->enum('status', ['active', 'inactive', 'terminated', 'on_leave'])->default('active');
            
            // Dados bancários
            $table->string('bank_name')->nullable();
            $table->string('bank_agency', 10)->nullable();
            $table->string('bank_account', 20)->nullable();
            $table->enum('account_type', ['checking', 'savings'])->nullable();
            
            // Documentos
            $table->string('photo_path')->nullable();
            $table->json('documents')->nullable(); // Para armazenar caminhos de documentos
            
            $table->text('notes')->nullable();
            $table->timestamps();
            
            // Índices
            $table->index(['status', 'department_id']);
            $table->index(['hire_date', 'termination_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};