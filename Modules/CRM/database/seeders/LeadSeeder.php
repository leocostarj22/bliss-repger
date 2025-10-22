<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Lead;

class LeadSeeder extends Seeder
{
    public function run(): void
    {
        Lead::factory()->count(50)->create();

        // Estados nomeados
        Lead::factory()->asNew()->count(10)->create();
        Lead::factory()->won()->count(5)->create();
        Lead::factory()->lost()->count(3)->create();
    }
}