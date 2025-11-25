<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Lead;

class LeadSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Lead 1', 'email' => 'lead1@example.com', 'phone' => '910000101', 'company' => 'Empresa A', 'status' => 'new', 'source' => 'website', 'value' => 100.00],
            ['name' => 'Lead 2', 'email' => 'lead2@example.com', 'phone' => '910000102', 'company' => 'Empresa B', 'status' => 'contacted', 'source' => 'email_marketing', 'value' => 200.00],
            ['name' => 'Lead 3', 'email' => 'lead3@example.com', 'phone' => '910000103', 'company' => 'Empresa C', 'status' => 'qualified', 'source' => 'referral', 'value' => 300.00],
            ['name' => 'Lead 4', 'email' => 'lead4@example.com', 'phone' => '910000104', 'company' => 'Empresa D', 'status' => 'won', 'source' => 'event', 'value' => 400.00],
            ['name' => 'Lead 5', 'email' => 'lead5@example.com', 'phone' => '910000105', 'company' => 'Empresa E', 'status' => 'lost', 'source' => 'other', 'value' => 0],
        ];

        foreach ($items as $data) {
            Lead::create($data);
        }
    }
}