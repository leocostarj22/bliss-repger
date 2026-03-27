<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'work_timezone')) {
                $table->string('work_timezone', 64)->nullable()->after('last_login_at');
            }

            if (! Schema::hasColumn('users', 'work_schedule')) {
                $table->json('work_schedule')->nullable()->after('work_timezone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'work_schedule')) {
                $table->dropColumn('work_schedule');
            }

            if (Schema::hasColumn('users', 'work_timezone')) {
                $table->dropColumn('work_timezone');
            }
        });
    }
};