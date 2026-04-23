<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('blog_posts', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->string('slug')->unique();
            $table->text('summary')->nullable();
            $table->longText('content');
            $table->string('cover_image_url')->nullable();
            $table->string('youtube_video_url')->nullable();
            $table->enum('category', ['feature', 'improvement', 'tutorial', 'announcement'])->default('feature');
            $table->json('tags')->nullable();
            $table->enum('status', ['draft', 'published'])->default('draft');
            $table->boolean('is_featured')->default(false);
            $table->integer('reading_time_minutes')->default(1);
            $table->integer('views_count')->default(0);

            $table->foreignId('author_id')->constrained('users')->onDelete('cascade');

            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'published_at']);
            $table->index(['category', 'status']);
            $table->index(['is_featured', 'published_at']);
            $table->index('author_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('blog_posts');
    }
};
