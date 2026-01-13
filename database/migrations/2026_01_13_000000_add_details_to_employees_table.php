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
        Schema::table('employees', function (Blueprint $table) {
            // Spouse fields
            $table->string('spouse_name')->nullable()->after('marital_status');
            $table->string('spouse_nif', 9)->nullable()->after('spouse_name');
            $table->boolean('spouse_joint_irs')->default(false)->after('spouse_nif');
            
            // Children fields
            $table->boolean('has_children')->default(false)->after('spouse_joint_irs');
            $table->json('children_data')->nullable()->after('has_children');
            
            // Document expiration
            $table->date('document_expiration_date')->nullable()->after('document_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn([
                'spouse_name', 
                'spouse_nif', 
                'spouse_joint_irs',
                'has_children', 
                'children_data',
                'document_expiration_date'
            ]);
        });
    }
};