<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            // Verificar se a coluna user_type já existe antes de adicioná-la
            if (!Schema::hasColumn('tickets', 'user_type')) {
                $table->string('user_type')->nullable()->after('user_id');
            }
        });
        
        // Atualizar registros existentes para usar User como padrão
        // (assumindo que tickets existentes foram criados por usuários da tabela users)
        DB::table('tickets')
            ->whereNotNull('user_id')
            ->whereNull('user_type')
            ->update(['user_type' => 'App\\Models\\User']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets', function (Blueprint $table) {
            if (Schema::hasColumn('tickets', 'user_type')) {
                $table->dropColumn('user_type');
            }
        });
    }
};