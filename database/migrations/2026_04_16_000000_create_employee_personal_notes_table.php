<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('employee_personal_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_user_id')->constrained('employee_users')->cascadeOnDelete();
            $table->string('title');
            $table->longText('content')->nullable();
            $table->string('color', 32)->nullable();
            $table->boolean('is_favorite')->default(false);
            $table->dateTime('remind_at')->nullable();
            $table->unsignedBigInteger('last_modified_by_employee_user_id')->nullable();
            $table->foreign('last_modified_by_employee_user_id', 'epn_last_mod_emp_fk')
                ->references('id')
                ->on('employee_users')
                ->nullOnDelete();
            $table->timestamps();

            $table->index(['employee_user_id', 'is_favorite']);
            $table->index(['employee_user_id', 'updated_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_personal_notes');
    }
};