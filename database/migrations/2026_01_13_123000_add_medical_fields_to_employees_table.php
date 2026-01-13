<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->date('medical_aptitude_date')->nullable()->after('status');
            $table->string('medical_status')->default('active')->after('medical_aptitude_date');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn(['medical_aptitude_date', 'medical_status']);
        });
    }
};