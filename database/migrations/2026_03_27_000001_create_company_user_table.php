<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->unique(['company_id', 'user_id']);
            $table->index(['user_id', 'company_id']);
        });

        DB::table('users')
            ->whereNotNull('company_id')
            ->orderBy('id')
            ->chunkById(500, function ($users) {
                $now = now();
                $payload = [];

                foreach ($users as $u) {
                    $payload[] = [
                        'company_id' => $u->company_id,
                        'user_id' => $u->id,
                        'is_primary' => true,
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if ($payload) {
                    DB::table('company_user')->upsert(
                        $payload,
                        ['company_id', 'user_id'],
                        ['is_primary', 'updated_at']
                    );
                }
            });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_user');
    }
};