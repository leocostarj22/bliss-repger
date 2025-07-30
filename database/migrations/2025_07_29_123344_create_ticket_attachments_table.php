<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ticket_attachments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // Quem fez upload
            $table->foreignId('ticket_comment_id')->nullable()->constrained()->cascadeOnDelete(); // Anexo de comentário específico
            $table->string('original_name'); // Nome original do arquivo
            $table->string('file_name'); // Nome do arquivo no storage
            $table->string('file_path'); // Caminho do arquivo
            $table->string('mime_type');
            $table->unsignedBigInteger('file_size'); // Tamanho em bytes
            $table->string('disk')->default('local'); // Disco de armazenamento
            $table->timestamps();
            
            $table->index(['ticket_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
            $table->index('ticket_comment_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_attachments');
    }
};