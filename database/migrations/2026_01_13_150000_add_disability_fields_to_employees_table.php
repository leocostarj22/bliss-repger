<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->boolean('has_disability')->default(false)->after('photo_path');
            $table->boolean('disability_declarant')->default(false)->after('has_disability');
            $table->boolean('disability_spouse')->default(false)->after('disability_declarant');
            $table->integer('disability_dependents')->default(0)->after('disability_spouse');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'has_disability',
                'disability_declarant',
                'disability_spouse',
                'disability_dependents',
            ]);
        });
    }
};