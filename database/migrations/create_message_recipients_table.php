<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('internal_messages')->onDelete('cascade');
            $table->foreignId('recipient_id')->constrained('users')->onDelete('cascade');
            $table->enum('type', ['to', 'cc', 'bcc'])->default('to');
            $table->timestamp('read_at')->nullable();
            $table->boolean('is_starred')->default(false);
            $table->boolean('is_archived')->default(false);
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
            
            $table->unique(['message_id', 'recipient_id']);
            $table->index(['recipient_id', 'read_at']);
            $table->index(['recipient_id', 'is_starred']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_recipients');
    }
};