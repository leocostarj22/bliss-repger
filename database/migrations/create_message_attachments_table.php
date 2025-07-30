<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('message_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('message_id')->constrained('internal_messages')->onDelete('cascade');
            $table->string('filename');
            $table->string('original_filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size');
            $table->string('file_path');
            $table->timestamps();
            
            $table->index('message_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('message_attachments');
    }
};