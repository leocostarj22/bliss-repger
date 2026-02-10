<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Atualiza o ENUM da coluna `source` para incluir 'quiz'
        DB::statement("
            ALTER TABLE `leads`
            MODIFY `source` ENUM(
                'website',
                'referral',
                'social_media',
                'email_marketing',
                'cold_call',
                'event',
                'quiz',
                'other'
            ) NOT NULL
        ");
    }

    public function down(): void
    {
        // Reverte para o ENUM anterior (sem 'quiz'), se necessário
        DB::statement("
            ALTER TABLE `leads`
            MODIFY `source` ENUM(
                'website',
                'referral',
                'social_media',
                'email_marketing',
                'cold_call',
                'event',
                'other'
            ) NOT NULL
        ");
    }
};