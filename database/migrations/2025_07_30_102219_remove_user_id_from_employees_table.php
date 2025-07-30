<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
            
            // Adicionar campos que estavam no User
            $table->string('name')->after('employee_code');
            $table->string('email')->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['name', 'email']);
            $table->foreignId('user_id')->constrained()->onDelete('cascade')->after('id');
        });
    }
};