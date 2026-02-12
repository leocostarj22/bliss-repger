<?php

namespace Modules\CRM\Database\Seeders;

use Illuminate\Database\Seeder;
use Modules\CRM\Models\Delivery;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Contact;
use Faker\Factory as Faker;

class DeliverySeeder extends Seeder
{
    public function run(): void
    {
        $faker = Faker::create();
        
        // Get only SENT campaigns
        $campaigns = Campaign::where('status', 'sent')->get();
        $contacts = Contact::all();

        if ($campaigns->isEmpty() || $contacts->isEmpty()) {
            return;
        }

        foreach ($campaigns as $campaign) {
            // Determine campaign sent date (or use created_at if scheduled_at null)
            $campaignDate = $campaign->scheduled_at ?? $campaign->created_at;

            foreach ($contacts as $contact) {
                // 80% chance of being sent to this contact
                if ($faker->boolean(80)) {
                    $sentAt = (clone $campaignDate)->modify('+' . rand(0, 120) . ' minutes'); // Sent within 2 hours of launch
                    
                    // Interaction logic
                    $isOpened = $faker->boolean(35); // 35% Open Rate
                    $isClicked = $isOpened && $faker->boolean(15); // 15% Click Rate if opened
                    $isBounced = !$isOpened && $faker->boolean(2); // 2% Bounce Rate

                    $openedAt = $isOpened ? (clone $sentAt)->modify('+' . rand(1, 48) . ' hours') : null;
                    $clickedAt = $isClicked ? (clone $openedAt)->modify('+' . rand(1, 10) . ' minutes') : null;
                    $bouncedAt = $isBounced ? (clone $sentAt)->modify('+1 minute') : null;

                    Delivery::create([
                        'campaign_id' => $campaign->id,
                        'contact_id' => $contact->id,
                        'status' => $isBounced ? 'bounced' : 'sent',
                        'sent_at' => $sentAt,
                        'opened_at' => $openedAt,
                        'clicked_at' => $clickedAt,
                        'bounced_at' => $bouncedAt,
                    ]);
                }
            }
        }
    }
}