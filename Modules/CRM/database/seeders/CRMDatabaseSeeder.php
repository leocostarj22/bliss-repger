<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;

class CRMDatabaseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->call([
            \Modules\CRM\Database\Seeders\LeadSeeder::class,
            \Modules\CRM\Database\Seeders\ContactSeeder::class,
            \Modules\CRM\Database\Seeders\SegmentSeeder::class,
            \Modules\CRM\Database\Seeders\TemplateSeeder::class,
            \Modules\CRM\Database\Seeders\CampaignSeeder::class,
            \Modules\CRM\Database\Seeders\DeliverySeeder::class,
        ]);
    }
}
