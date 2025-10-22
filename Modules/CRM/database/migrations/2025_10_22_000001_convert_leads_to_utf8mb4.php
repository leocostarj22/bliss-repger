<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Converte toda a tabela e as colunas para utf8mb4
        DB::statement('ALTER TABLE `leads` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;');

        // Opcional: se existirem índices únicos que possam falhar por collation incompatível,
        // poderá ser necessário soltar e recriar índices após a conversão.
        // Exemplo:
        // DB::statement('ALTER TABLE `leads` DROP INDEX `leads_email_unique`;');
        // DB::statement('ALTER TABLE `leads` ADD UNIQUE `leads_email_unique` (`email`);');
    }

    public function down(): void
    {
        // Sem reversão automática segura – se necessário, volta manualmente ao charset anterior.
    }
};