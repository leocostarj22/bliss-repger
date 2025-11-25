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
        $names = ['Campanha BF', 'Campanha Lançamento', 'Campanha Site', 'Campanha Referral', 'Campanha Follow-up'];
        $channels = ['email', 'email', 'sms', 'whatsapp', 'email'];

        for ($i = 0; $i < 5; $i++) {
            $segment = Segment::inRandomOrder()->first();
            $template = Template::inRandomOrder()->first();

            Campaign::create([
                'name' => $names[$i],
                'channel' => $channels[$i],
                'status' => 'draft',
                'segment_id' => $segment?->id,
                'template_id' => $template?->id,
                'scheduled_at' => now(),
            ]);
        }
    }
}