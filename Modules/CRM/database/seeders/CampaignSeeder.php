<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Segment;
use Modules\CRM\Models\Template;

class CampaignSeeder extends Seeder
{
    public function run(): void
    {
        // Ensure we have clean slate or update existing
        $campaigns = [
            ['name' => 'Black Friday Sale', 'status' => 'sent', 'channel' => 'email'],
            ['name' => 'Welcome Series', 'status' => 'sent', 'channel' => 'email'],
            ['name' => 'Product Launch', 'status' => 'sent', 'channel' => 'email'],
            ['name' => 'Monthly Newsletter', 'status' => 'draft', 'channel' => 'email'],
            ['name' => 'Re-engagement', 'status' => 'scheduled', 'channel' => 'email'],
        ];

        foreach ($campaigns as $campData) {
            $segment = Segment::inRandomOrder()->first();
            $template = Template::inRandomOrder()->first();

            Campaign::create([
                'name' => $campData['name'],
                'channel' => $campData['channel'],
                'status' => $campData['status'],
                'segment_id' => $segment?->id,
                'template_id' => $template?->id,
                'scheduled_at' => $campData['status'] === 'scheduled' ? now()->addDays(2) : ($campData['status'] === 'sent' ? now()->subDays(rand(1, 30)) : null),
                'created_at' => now()->subDays(rand(1, 60)),
            ]);
        }
    }
}