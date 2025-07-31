<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
        $table->id();
        $table->string('title');
        $table->text('content');
        $table->enum('type', ['text', 'image', 'video', 'announcement'])->default('text');
        $table->enum('status', ['draft', 'published', 'archived'])->default('draft');
        $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
        $table->boolean('is_pinned')->default(false);
        $table->string('featured_image_url')->nullable();
        $table->string('youtube_video_url')->nullable();
        $table->json('attachment_urls')->nullable();
        $table->foreignId('author_id')->constrained('users')->onDelete('cascade');
        $table->json('visible_to_departments')->nullable();
        $table->timestamp('published_at')->nullable();
        $table->timestamp('expires_at')->nullable();
        $table->integer('views_count')->default(0);
        $table->timestamps();
        
        $table->index(['status', 'published_at']);
        $table->index(['type', 'priority']);
        $table->index(['is_pinned', 'published_at']);
        $table->index('author_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};

