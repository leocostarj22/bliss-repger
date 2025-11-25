<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Delivery;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Contact;

class DeliverySeeder extends Seeder
{
    public function run(): void
    {
        $campaign = Campaign::first();
        if (! $campaign) {
            return;
        }

        $contacts = Contact::whereNotNull('email')->limit(5)->get();
        foreach ($contacts as $contact) {
            Delivery::create([
                'campaign_id' => $campaign->id,
                'contact_id' => $contact->id,
                'status' => 'queued',
            ]);
        }
    }
}