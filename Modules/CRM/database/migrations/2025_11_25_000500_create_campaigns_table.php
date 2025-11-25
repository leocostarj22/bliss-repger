<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name')->index();
            $table->string('channel')->default('email')->index();
            $table->string('status')->default('draft')->index();
            $table->foreignId('segment_id')->nullable()->constrained('segments')->nullOnDelete();
            $table->foreignId('template_id')->nullable()->constrained('templates')->nullOnDelete();
            $table->dateTime('scheduled_at')->nullable()->index();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'scheduled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaigns');
    }
};