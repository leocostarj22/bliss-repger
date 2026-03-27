<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_notes', function (Blueprint $table) {
            $table->dateTime('remind_at')->nullable()->after('is_favorite');
        });
    }

    public function down(): void
    {
        Schema::table('personal_notes', function (Blueprint $table) {
            $table->dropColumn('remind_at');
        });
    }
};