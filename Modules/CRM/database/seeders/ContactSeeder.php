<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Contact;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            ['name' => 'Ana Silva', 'email' => 'ana@example.com', 'phone' => '910000001', 'status' => 'prospect', 'utm_source' => 'website', 'utm_campaign' => 'Black-Friday'],
            ['name' => 'Bruno Dias', 'email' => 'bruno@example.com', 'phone' => '910000002', 'status' => 'prospect', 'utm_source' => 'social', 'utm_campaign' => 'Black-Friday'],
            ['name' => 'Carla Souza', 'email' => 'carla@example.com', 'phone' => '910000003', 'status' => 'prospect', 'utm_source' => 'email', 'utm_campaign' => 'Launch'],
            ['name' => 'Daniel Lima', 'email' => 'daniel@example.com', 'phone' => '910000004', 'status' => 'prospect', 'utm_source' => 'website', 'utm_campaign' => 'Launch'],
            ['name' => 'Eva Rocha', 'email' => 'eva@example.com', 'phone' => '910000005', 'status' => 'prospect', 'utm_source' => 'referral', 'utm_campaign' => 'Referral'],
        ];

        foreach ($items as $data) {
            Contact::create($data);
        }
    }
}