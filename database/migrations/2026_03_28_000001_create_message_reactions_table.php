<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_reactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_recipient_id')->constrained('message_recipients')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->string('emoji', 32);
            $table->timestamp('created_at')->nullable();

            $table->unique(['message_recipient_id', 'user_id', 'emoji'], 'msg_reactions_unique');
            $table->index(['message_recipient_id'], 'msg_reactions_recipient_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_reactions');
    }
};