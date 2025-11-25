<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email')->nullable()->index();
            $table->string('phone')->nullable();
            $table->foreignId('company_id')->nullable()->constrained('companies')->onDelete('set null');
            $table->string('source')->nullable()->index();
            $table->string('status')->default('prospect')->index();
            $table->string('utm_source')->nullable()->index();
            $table->string('utm_medium')->nullable()->index();
            $table->string('utm_campaign')->nullable()->index();
            $table->string('utm_content')->nullable();
            $table->string('utm_term')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['status', 'company_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};