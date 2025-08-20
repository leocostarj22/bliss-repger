<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Remove a restrição única global do slug
            $table->dropUnique(['slug']);
            
            // Adiciona uma restrição única composta (slug + company_id)
            $table->unique(['slug', 'company_id'], 'departments_slug_company_unique');
        });
    }

    public function down(): void
    {
        Schema::table('departments', function (Blueprint $table) {
            // Remove a restrição única composta
            $table->dropUnique('departments_slug_company_unique');
            
            // Restaura a restrição única global (apenas para rollback)
            $table->unique('slug');
        });
    }
};