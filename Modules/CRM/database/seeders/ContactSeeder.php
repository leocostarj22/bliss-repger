<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Contact;
use Faker\Factory as Faker;

class ContactSeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create('pt_PT');

        // Static contacts for predictability
        $items = [
            ['name' => 'Ana Silva', 'email' => 'ana@example.com', 'phone' => '910000001', 'status' => 'prospect', 'utm_source' => 'website', 'utm_campaign' => 'Black-Friday'],
            ['name' => 'Bruno Dias', 'email' => 'bruno@example.com', 'phone' => '910000002', 'status' => 'prospect', 'utm_source' => 'social', 'utm_campaign' => 'Black-Friday'],
            ['name' => 'Carla Souza', 'email' => 'carla@example.com', 'phone' => '910000003', 'status' => 'prospect', 'utm_source' => 'email', 'utm_campaign' => 'Launch'],
        ];

        foreach ($items as $data) {
            Contact::firstOrCreate(['email' => $data['email']], $data);
        }

        // Generate random contacts
        for ($i = 0; $i < 100; $i++) {
            Contact::create([
                'name' => $faker->name,
                'email' => $faker->unique()->safeEmail,
                'phone' => $faker->phoneNumber,
                'status' => $faker->randomElement(['prospect', 'lead', 'customer']),
                'utm_source' => $faker->randomElement(['website', 'social', 'referral', 'email']),
                'utm_campaign' => $faker->randomElement(['Black-Friday', 'Launch', 'Summer-Sale', 'Welcome']),
                'created_at' => $faker->dateTimeBetween('-6 months', 'now'),
            ]);
        }
    }
}