<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'permissions_allow')) {
                $table->json('permissions_allow')->nullable()->after('photo_path');
            }
            if (! Schema::hasColumn('users', 'permissions_deny')) {
                $table->json('permissions_deny')->nullable()->after('permissions_allow');
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'permissions_deny')) {
                $table->dropColumn('permissions_deny');
            }
            if (Schema::hasColumn('users', 'permissions_allow')) {
                $table->dropColumn('permissions_allow');
            }
        });
    }
};