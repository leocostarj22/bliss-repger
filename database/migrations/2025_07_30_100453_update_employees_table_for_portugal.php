<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Remover campos antigos
            $table->dropUnique(['cpf']);
            $table->dropColumn(['cpf', 'rg']);
            
            // Adicionar novos campos
            $table->string('nif', 9)->unique()->after('employee_code');
            $table->enum('document_type', ['cartao_cidadao', 'titulo_residencia', 'passaporte', 'bilhete_identidade', 'outro'])->after('nif');
            $table->string('document_number', 50)->after('document_type');
            $table->string('nis', 11)->unique()->nullable()->after('document_number');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            // Reverter as alterações
            $table->dropUnique(['nif']);
            $table->dropUnique(['nis']);
            $table->dropColumn(['nif', 'document_type', 'document_number', 'nis']);
            
            // Restaurar campos antigos
            $table->string('cpf', 14)->unique()->after('employee_code');
            $table->string('rg', 20)->nullable()->after('cpf');
        });
    }
};