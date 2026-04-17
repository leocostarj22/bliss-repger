<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'notify_email')) {
                $table->boolean('notify_email')->default(true);
            }
            if (!Schema::hasColumn('users', 'notify_sms')) {
                $table->boolean('notify_sms')->default(false);
            }
            if (!Schema::hasColumn('users', 'notify_audio')) {
                $table->boolean('notify_audio')->default(true);
            }
        });

        Schema::table('employee_users', function (Blueprint $table) {
            if (!Schema::hasColumn('employee_users', 'notify_email')) {
                $table->boolean('notify_email')->default(true);
            }
            if (!Schema::hasColumn('employee_users', 'notify_sms')) {
                $table->boolean('notify_sms')->default(false);
            }
            if (!Schema::hasColumn('employee_users', 'notify_audio')) {
                $table->boolean('notify_audio')->default(true);
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'notify_email')) $table->dropColumn('notify_email');
            if (Schema::hasColumn('users', 'notify_sms')) $table->dropColumn('notify_sms');
            if (Schema::hasColumn('users', 'notify_audio')) $table->dropColumn('notify_audio');
        });

        Schema::table('employee_users', function (Blueprint $table) {
            if (Schema::hasColumn('employee_users', 'notify_email')) $table->dropColumn('notify_email');
            if (Schema::hasColumn('employee_users', 'notify_sms')) $table->dropColumn('notify_sms');
            if (Schema::hasColumn('employee_users', 'notify_audio')) $table->dropColumn('notify_audio');
        });
    }
};