<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('video_calls', function (Blueprint $table) {
            // Exemplo: adicionar coluna 'title'
            if (!Schema::hasColumn('video_calls', 'title')) {
                $table->string('title')->nullable();
            }
            
            // Exemplo: adicionar coluna 'description'
            if (!Schema::hasColumn('video_calls', 'description')) {
                $table->text('description')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('video_calls', function (Blueprint $table) {
            $table->dropColumn(['title', 'description']);
        });
    }
};
