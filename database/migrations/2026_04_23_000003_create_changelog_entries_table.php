<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('changelog_entries', function (Blueprint $table) {
            $table->id();

            $table->foreignId('changelog_id')->constrained('changelogs')->onDelete('cascade');
            $table->enum('type', ['new', 'improvement', 'fix', 'breaking', 'security'])->default('new');
            $table->text('description');
            $table->string('module', 100)->nullable();
            $table->foreignId('related_blog_post_id')->nullable()->constrained('blog_posts')->nullOnDelete();
            $table->integer('sort_order')->default(0);

            $table->timestamps();

            $table->index(['changelog_id', 'type']);
            $table->index(['changelog_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('changelog_entries');
    }
};
