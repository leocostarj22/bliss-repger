<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_contacts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->onDelete('cascade');
            $table->string('gocontact_id')->nullable()->index();
            $table->dateTime('load_date')->nullable();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            
            // Telefones
            for ($i = 1; $i <= 8; $i++) {
                $table->string("phone_$i")->nullable();
            }

            // Endereço
            $table->string('postal_code')->nullable();
            $table->string('address')->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();

            // Perguntas e Dados Operacionais
            $table->text('question_1')->nullable();
            $table->text('question_2')->nullable();
            $table->text('question_3')->nullable();
            $table->string('outcome')->nullable();
            $table->integer('total_calls')->default(0);
            $table->integer('total_recycle')->default(0);
            $table->string('agent')->nullable();
            
            // Flags
            $table->boolean('is_new')->default(false);
            $table->boolean('is_closed')->default(false);
            $table->boolean('is_in_recycle')->default(false);
            $table->boolean('is_in_callback')->default(false);
            $table->string('lead_status')->nullable();
            $table->boolean('deleted')->default(false);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_contacts');
    }
};