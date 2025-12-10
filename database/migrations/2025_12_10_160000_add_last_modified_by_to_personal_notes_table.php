<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('personal_notes', function (Blueprint $table) {
            $table->foreignId('last_modified_by')->nullable()->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('personal_notes', function (Blueprint $table) {
            $table->dropForeign(['last_modified_by']);
            $table->dropColumn('last_modified_by');
        });
    }
};