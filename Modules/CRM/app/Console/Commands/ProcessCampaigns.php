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
    protected $signature = 'crm:process-campaigns {--sync : Envia os e-mails de forma síncrona (sem fila)}';

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

        $this->info("Server Time: " . now()->toDateTimeString());

        // DEBUG: List ALL campaigns to see what is actually in the DB
        $all = Campaign::all(['id', 'name', 'status', 'scheduled_at', 'channel']);
        $this->info("Total Campaigns in DB: " . $all->count());
        foreach($all as $c) {
            $this->info("ID: {$c->id} | Name: {$c->name} | Status: {$c->status} | Channel: {$c->channel} | Scheduled: {$c->scheduled_at}");
        }

        // 0. Reset Stuck Campaigns (Sending > 1 hour)
        $stuck = Campaign::where('status', 'sending')
            ->where('updated_at', '<', now()->subHour())
            ->update(['status' => 'draft']);
        
        if ($stuck > 0) {
            $this->info("Reset {$stuck} stuck campaigns to draft.");
        }

        // 1. Get Scheduled Campaigns
        $query = Campaign::where('status', 'scheduled')
            ->where('channel', 'email');
            
        // Check for future scheduled campaigns to log them
        $future = (clone $query)->where('scheduled_at', '>', now())->count();
        if ($future > 0) {
            $this->info("Found {$future} campaigns scheduled for the future.");
        }

        $campaigns = $query->where('scheduled_at', '<=', now())->get();

        if ($campaigns->isEmpty()) {
            $this->info('No scheduled campaigns ready to process (checked status=scheduled, channel=email, scheduled_at<=now).');
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
                    $this->info("No contacts found for segment {$campaign->segment_id}. Reverting campaign to draft.");
                    Log::warning("crm.campaign.no_contacts", ['campaign_id' => $campaign->id, 'segment_id' => $campaign->segment_id]);
                    $campaign->update(['status' => 'draft']);
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
                    if ($this->option('sync')) {
                        SendDeliveryEmail::dispatchSync($delivery->id);
                    } else {
                        SendDeliveryEmail::dispatch($delivery->id);
                    }
                    $count++;
                }
                
                if ($count === 0) {
                    $this->info("No deliveries queued for campaign {$campaign->id}. Reverting to draft.");
                    Log::warning("crm.campaign.no_deliveries", ['campaign_id' => $campaign->id]);
                    $campaign->update(['status' => 'draft']);
                } else {
                    $this->info("Dispatched {$count} emails for campaign {$campaign->id}. Campaign remains 'sending' until all deliveries complete.");
                }

            } catch (\Exception $e) {
                Log::error("Failed to process campaign {$campaign->id}: " . $e->getMessage());
                // Keep as sending or revert? Revert to draft to allow retry.
                $campaign->update(['status' => 'draft']); 
            }
        }

        return 0;
    }
}
