<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('task_shares', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->foreign('task_id')
                  ->references('id')
                  ->on('tasks')
                  ->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::table('task_shares', function (Blueprint $table) {
            $table->dropForeign(['task_id']);
            $table->foreign('task_id')
                  ->references('id')
                  ->on('tasks');
        });
    }
};