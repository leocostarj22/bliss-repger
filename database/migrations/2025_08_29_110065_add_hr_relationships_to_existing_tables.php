<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Adicionar campos de configuração de RH à tabela companies
        Schema::table('companies', function (Blueprint $table) {
            $table->decimal('standard_work_hours', 5, 2)->default(8.00)->after('is_active'); // Horas padrão de trabalho
            $table->time('standard_start_time')->default('09:00')->after('standard_work_hours'); // Hora padrão de entrada
            $table->time('standard_end_time')->default('18:00')->after('standard_start_time'); // Hora padrão de saída
            $table->integer('annual_vacation_days')->default(22)->after('standard_end_time'); // Dias de férias anuais (Portugal: 22 dias)
        });
        
        // Adicionar campos de configuração de RH à tabela employees
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('hourly_rate', 8, 2)->nullable()->after('salary'); // Taxa horária
            $table->integer('vacation_days_balance')->default(0)->after('hourly_rate'); // Saldo de dias de férias
            $table->date('last_vacation_calculation')->nullable()->after('vacation_days_balance'); // Última atualização do saldo
        });
    }

    public function down(): void
    {
        Schema::table('companies', function (Blueprint $table) {
            $table->dropColumn([
                'standard_work_hours',
                'standard_start_time', 
                'standard_end_time',
                'annual_vacation_days'
            ]);
        });
        
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'hourly_rate',
                'vacation_days_balance',
                'last_vacation_calculation'
            ]);
        });
    }
};