<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('internal_messages', function (Blueprint $table) {
            $table->id();
            $table->string('subject');
            $table->longText('body');
            $table->enum('priority', ['low', 'normal', 'high', 'urgent'])->default('normal');
            $table->enum('status', ['draft', 'sent', 'archived'])->default('draft');
            $table->foreignId('sender_id')->constrained('users')->onDelete('cascade');
            $table->boolean('is_broadcast')->default(false); // Para mensagens em massa
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            
            $table->index(['sender_id', 'status']);
            $table->index('sent_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('internal_messages');
    }
};