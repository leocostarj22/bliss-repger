<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("
            ALTER TABLE `vacations`
            MODIFY `vacation_type` ENUM(
                'annual_leave',
                'maternity_leave',
                'paternity_leave',
                'sick_leave',
                'marriage_leave',
                'bereavement_leave',
                'study_leave',
                'unpaid_leave',
                'compensatory_leave',
                'advance_leave',
                'other'
            ) NOT NULL DEFAULT 'annual_leave'
        ");
    }

    public function down(): void
    {
        DB::statement("
            ALTER TABLE `vacations`
            MODIFY `vacation_type` ENUM(
                'annual_leave',
                'maternity_leave',
                'paternity_leave',
                'sick_leave',
                'marriage_leave',
                'bereavement_leave',
                'study_leave',
                'unpaid_leave',
                'other'
            ) NOT NULL DEFAULT 'annual_leave'
        ");
    }
};