<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('crm_automations')) {
            Schema::create('crm_automations', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('name');
                $table->text('description')->nullable();
                $table->string('status')->default('draft'); // active, paused, draft
                $table->string('trigger_type')->nullable(); // e.g., 'contact_created', 'tag_added'
                $table->json('trigger_config')->nullable(); // e.g., { "tag_id": 1 }
                $table->json('graph_data')->nullable(); // Stores React Flow nodes and edges
                $table->integer('triggered_count')->default(0);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (!Schema::hasTable('crm_automation_executions')) {
            Schema::create('crm_automation_executions', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('automation_id')->constrained('crm_automations')->onDelete('cascade');
                $table->foreignId('contact_id')->constrained('contacts')->onDelete('cascade');
                $table->string('current_node_id')->nullable(); // The step where the contact is currently at
                $table->string('status')->default('running'); // running, completed, failed, waiting
                $table->timestamp('next_run_at')->nullable(); // For delays
                $table->json('context')->nullable(); // Store variables collected during flow
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('crm_automation_logs')) {
            Schema::create('crm_automation_logs', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->foreignUuid('execution_id')->constrained('crm_automation_executions')->onDelete('cascade');
                $table->string('node_id');
                $table->string('node_type'); // action, condition, delay, trigger
                $table->string('node_label')->nullable();
                $table->string('status'); // success, failed
                $table->text('message')->nullable(); // Error message or success details
                $table->json('output')->nullable(); // Result data
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('crm_automation_logs');
        Schema::dropIfExists('crm_automation_executions');
        Schema::dropIfExists('crm_automations');
    }
};