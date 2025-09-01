<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('help_articles', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug')->unique();
            $table->longText('content');
            $table->text('excerpt')->nullable();
            $table->string('category');
            $table->json('tags')->nullable();
            $table->boolean('is_published')->default(true);
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('helpful_count')->default(0);
            $table->unsignedInteger('not_helpful_count')->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('featured')->default(false);
            $table->enum('target_audience', ['admin', 'employee', 'both'])->default('both');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['category', 'is_published']);
            $table->index(['target_audience', 'is_published']);
            $table->index(['featured', 'is_published']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('help_articles');
    }
};