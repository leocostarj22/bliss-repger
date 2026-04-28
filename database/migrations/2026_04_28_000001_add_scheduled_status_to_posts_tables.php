<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE blog_posts MODIFY COLUMN status ENUM('draft', 'scheduled', 'published') NOT NULL DEFAULT 'draft'");
        DB::statement("ALTER TABLE posts MODIFY COLUMN status ENUM('draft', 'scheduled', 'published', 'archived') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE blog_posts SET status = 'draft' WHERE status = 'scheduled'");
        DB::statement("UPDATE posts SET status = 'draft' WHERE status = 'scheduled'");
        DB::statement("ALTER TABLE blog_posts MODIFY COLUMN status ENUM('draft', 'published') NOT NULL DEFAULT 'draft'");
        DB::statement("ALTER TABLE posts MODIFY COLUMN status ENUM('draft', 'published', 'archived') NOT NULL DEFAULT 'draft'");
    }
};
