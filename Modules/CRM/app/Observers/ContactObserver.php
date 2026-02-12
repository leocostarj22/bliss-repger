<?php

namespace Modules\CRM\Observers;

use Modules\CRM\Models\Contact;
use Modules\CRM\Models\Automation;
use Modules\CRM\Models\AutomationExecution;
use Modules\CRM\Jobs\ProcessAutomationStep;
use Illuminate\Support\Facades\Log;

class ContactObserver
{
    /**
     * Handle the Contact "created" event.
     */
    public function created(Contact $contact): void
    {
        // Find active automations with 'contact_created' trigger
        $automations = Automation::where('status', 'active')
            ->where('trigger_type', 'contact_created')
            ->get();

        foreach ($automations as $automation) {
            // Check if there's a specific condition in trigger_config (e.g., source='facebook')
            // For now, trigger for all
            
            // Create Execution
            $execution = AutomationExecution::create([
                'automation_id' => $automation->id,
                'contact_id' => $contact->id,
                'current_node_id' => $automation->nodes[0]['id'] ?? null, // Start at first node
                'status' => 'running',
                'context' => [],
            ]);

            // Increment trigger count
            $automation->increment('triggered_count');

            // Dispatch first step
            ProcessAutomationStep::dispatch($execution);
            
            Log::info("Automation Triggered: {$automation->name} for Contact ID: {$contact->id}");
        }
    }

    /**
     * Handle the Contact "updated" event.
     */
    public function updated(Contact $contact): void
    {
        // Check for 'tag_added' trigger
        if ($contact->wasChanged('tags')) {
            // Logic to find new tags and trigger automations
            // ...
        }
    }
}