<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('deliveries', 'clicked_url')) {
            Schema::table('deliveries', function (Blueprint $table) {
                $table->string('clicked_url')->nullable()->after('clicked_at');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('deliveries', 'clicked_url')) {
            Schema::table('deliveries', function (Blueprint $table) {
                $table->dropColumn('clicked_url');
            });
        }
    }
};