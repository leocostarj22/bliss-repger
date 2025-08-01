<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['pending', 'in_progress', 'completed', 'cancelled'])->default('pending');
            $table->datetime('due_date')->nullable();
            $table->datetime('start_date')->nullable();
            $table->datetime('completed_at')->nullable();
            $table->boolean('is_all_day')->default(false);
            $table->string('location')->nullable();
            $table->text('notes')->nullable();
            
            // Relacionamentos polimórficos para users e employee_users
            $table->morphs('taskable'); // taskable_type e taskable_id
            
            // Campos para integração com calendário
            $table->string('calendar_event_id')->nullable();
            $table->json('recurrence_rule')->nullable(); // Para eventos recorrentes
            $table->boolean('is_private')->default(true);
            
            $table->timestamps();
            
            // Índices (removido o índice duplicado para taskable)
            $table->index(['status', 'due_date']);
            $table->index(['priority', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};