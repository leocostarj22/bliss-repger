<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('changelogs', function (Blueprint $table) {
            $table->id();

            $table->string('version', 20);
            $table->string('title');
            $table->text('summary')->nullable();
            $table->date('release_date');
            $table->boolean('is_major')->default(false);
            $table->boolean('is_published')->default(false);

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();

            $table->unique('version');
            $table->index(['is_published', 'release_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('changelogs');
    }
};
