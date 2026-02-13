<?php

namespace Modules\CRM\Console\Commands;

use Illuminate\Console\Command;
use Modules\CRM\Models\Campaign;
use Modules\CRM\Models\Delivery;
use Modules\CRM\Services\SegmentResolver;
use Modules\CRM\Jobs\SendDeliveryEmail;
use Illuminate\Support\Facades\Log;

class ProcessCampaigns extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crm:process-campaigns';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process scheduled campaigns and send emails.';

    /**
     * Execute the console command.
     */
    public function handle(SegmentResolver $resolver)
    {
        set_time_limit(0); // Prevent timeout for large lists

        // 0. Reset Stuck Campaigns (Sending > 1 hour)
        $stuck = Campaign::where('status', 'sending')
            ->where('updated_at', '<', now()->subHour())
            ->update(['status' => 'draft']);
        
        if ($stuck > 0) {
            $this->info("Reset {$stuck} stuck campaigns to draft.");
        }

        // 1. Get Scheduled Campaigns
        $campaigns = Campaign::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->where('channel', 'email')
            ->get();

        if ($campaigns->isEmpty()) {
            $this->info('No scheduled campaigns to process.');
            return 0;
        }

        foreach ($campaigns as $campaign) {
            $this->info("Processing Campaign ID: {$campaign->id} - {$campaign->name}");
            
            // 2. Mark as Sending
            $campaign->update(['status' => 'sending']);

            try {
                // 3. Resolve Contacts
                if (!$campaign->segment_id) {
                     Log::warning("Campaign {$campaign->id} has no segment.");
                     // Revert to draft so user can fix it
                     $campaign->update(['status' => 'draft']); 
                     continue;
                }
                
                $contacts = $resolver->resolveContacts($campaign->segment_id);
                
                if ($contacts->isEmpty()) {
                    $this->info("No contacts found for segment {$campaign->segment_id}.");
                    $campaign->update(['status' => 'sent']);
                    continue;
                }

                $count = 0;
                foreach ($contacts as $contact) {
                    // 4. Create Delivery
                    $delivery = Delivery::firstOrCreate([
                        'campaign_id' => $campaign->id,
                        'contact_id' => $contact->id,
                    ], [
                        'status' => 'pending',
                        'sent_at' => null,
                    ]);
                    
                    if ($delivery->status === 'sent') {
                         continue; // Already sent
                    }

                    // 5. Dispatch Job
                    SendDeliveryEmail::dispatch($delivery->id);
                    $count++;
                }
                
                // 6. Mark as Sent
                $campaign->update(['status' => 'sent']);
                
                $this->info("Dispatched {$count} emails for campaign {$campaign->id}.");

            } catch (\Exception $e) {
                Log::error("Failed to process campaign {$campaign->id}: " . $e->getMessage());
                // Keep as sending or revert? Revert to draft to allow retry.
                $campaign->update(['status' => 'draft']); 
            }
        }

        return 0;
    }
}
