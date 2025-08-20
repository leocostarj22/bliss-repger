<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ticket_comments', function (Blueprint $table) {
            // Adicionar campo user_type para relacionamento polimórfico
            $table->string('user_type')->nullable()->after('user_id');
        });
        
        // Atualizar registros existentes para definir user_type como User
        DB::table('ticket_comments')
            ->whereNull('user_type')
            ->update(['user_type' => 'App\\Models\\User']);
    }

    public function down(): void
    {
        Schema::table('ticket_comments', function (Blueprint $table) {
            $table->dropColumn('user_type');
        });
    }
};