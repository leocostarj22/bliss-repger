<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'utm_source')) {
                $table->string('utm_source')->nullable()->index();
            }
            if (!Schema::hasColumn('leads', 'utm_medium')) {
                $table->string('utm_medium')->nullable()->index();
            }
            if (!Schema::hasColumn('leads', 'utm_campaign')) {
                $table->string('utm_campaign')->nullable()->index();
            }
            if (!Schema::hasColumn('leads', 'utm_content')) {
                $table->string('utm_content')->nullable();
            }
            if (!Schema::hasColumn('leads', 'utm_term')) {
                $table->string('utm_term')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (Schema::hasColumn('leads', 'utm_source')) {
                $table->dropColumn('utm_source');
            }
            if (Schema::hasColumn('leads', 'utm_medium')) {
                $table->dropColumn('utm_medium');
            }
            if (Schema::hasColumn('leads', 'utm_campaign')) {
                $table->dropColumn('utm_campaign');
            }
            if (Schema::hasColumn('leads', 'utm_content')) {
                $table->dropColumn('utm_content');
            }
            if (Schema::hasColumn('leads', 'utm_term')) {
                $table->dropColumn('utm_term');
            }
        });
    }
};