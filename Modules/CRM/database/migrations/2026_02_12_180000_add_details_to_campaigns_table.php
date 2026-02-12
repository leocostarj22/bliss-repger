<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('preheader')->nullable()->after('subject');
            $table->string('from_name')->nullable()->after('preheader');
            $table->string('from_email')->nullable()->after('from_name');
            $table->boolean('track_opens')->default(true)->after('content');
            $table->boolean('track_clicks')->default(true)->after('track_opens');
            $table->boolean('track_replies')->default(false)->after('track_clicks');
            $table->boolean('use_google_analytics')->default(false)->after('track_replies');
            $table->boolean('is_public')->default(true)->after('use_google_analytics');
            $table->string('physical_address')->nullable()->after('is_public');
        });
    }

    public function down(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropColumn([
                'preheader', 'from_name', 'from_email',
                'track_opens', 'track_clicks', 'track_replies',
                'use_google_analytics', 'is_public', 'physical_address'
            ]);
        });
    }
};