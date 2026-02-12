<?php

namespace Modules\CRM\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Modules\CRM\Models\Automation;
use Modules\CRM\Models\AutomationExecution;
use Modules\CRM\Models\AutomationLog;
use Modules\CRM\Models\Contact;
use Illuminate\Support\Facades\Log;

class ProcessAutomationStep implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $execution;
    protected $nodeId;

    /**
     * Create a new job instance.
     *
     * @param AutomationExecution $execution The execution instance
     * @param string|null $nodeId The specific node to process (if null, uses execution's current node)
     */
    public function __construct(AutomationExecution $execution, ?string $nodeId = null)
    {
        $this->execution = $execution;
        $this->nodeId = $nodeId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $execution = $this->execution;
        $automation = $execution->automation;
        $contact = $execution->contact;

        if (!$automation || !$contact) {
            $execution->update(['status' => 'failed']);
            return;
        }

        // Determine which node to process
        $currentNodeId = $this->nodeId ?? $execution->current_node_id;
        
        // Find the node configuration in the automation graph
        $nodes = $automation->nodes ?? [];
        $currentNode = collect($nodes)->firstWhere('id', $currentNodeId);

        if (!$currentNode) {
            // End of automation or invalid node
            $execution->update(['status' => 'completed']);
            return;
        }

        // Log the step start
        $log = AutomationLog::create([
            'execution_id' => $execution->id,
            'node_id' => $currentNode['id'],
            'node_type' => $currentNode['type'],
            'node_label' => $currentNode['label'] ?? 'Unknown Step',
            'status' => 'running',
        ]);

        try {
            // Process the node based on type
            $result = $this->processNode($currentNode, $contact);
            
            // Mark step as success
            $log->update([
                'status' => 'success',
                'message' => 'Step completed successfully',
                'output' => $result
            ]);

            // Determine next step
            $nextNodeId = $this->getNextNodeId($automation, $currentNodeId, $result);

            if ($nextNodeId) {
                // Move execution pointer
                $execution->update([
                    'current_node_id' => $nextNodeId,
                    'status' => 'running'
                ]);

                // Check if next node is a Delay
                $nextNode = collect($nodes)->firstWhere('id', $nextNodeId);
                if ($nextNode && $nextNode['type'] === 'delay') {
                    $this->handleDelay($execution, $nextNode);
                } else {
                    // Immediate execution for non-delay nodes
                    // Dispatch next step immediately
                    self::dispatch($execution, $nextNodeId);
                }
            } else {
                // No more steps
                $execution->update(['status' => 'completed']);
            }

        } catch (\Exception $e) {
            $log->update([
                'status' => 'failed',
                'message' => $e->getMessage()
            ]);
            $execution->update(['status' => 'failed']);
            Log::error("Automation Error: " . $e->getMessage());
        }
    }

    protected function processNode($node, Contact $contact)
    {
        switch ($node['type']) {
            case 'action':
                // Example: Send Email
                if (str_contains(strtolower($node['label']), 'email')) {
                    // Logic to send email would go here
                    // Mail::to($contact->email)->send(new CampaignMail(...));
                    return ['action' => 'email_sent'];
                }
                // Example: Add Tag
                if (str_contains(strtolower($node['label']), 'tag')) {
                    // $contact->addTag(...)
                    return ['action' => 'tag_added'];
                }
                return ['action' => 'generic_action_executed'];

            case 'condition':
                // Example: Check if tag exists
                // return true or false based on condition
                return true; 

            case 'trigger':
                return ['trigger' => 'started'];
            
            default:
                return [];
        }
    }

    protected function getNextNodeId($automation, $currentNodeId, $result)
    {
        $connections = $automation->connections ?? [];
        
        // Find connection starting from current node
        // In a real implementation, we would check handles (e.g., 'sourceHandle' for true/false in conditions)
        $connection = collect($connections)->firstWhere('source', $currentNodeId);
        
        return $connection ? $connection['target'] : null;
    }

    protected function handleDelay($execution, $node)
    {
        // Calculate delay
        // For simplicity, let's assume config has 'minutes' or default to 1 minute
        $minutes = $node['config']['minutes'] ?? 1; 
        
        $execution->update([
            'status' => 'waiting',
            'next_run_at' => now()->addMinutes($minutes)
        ]);
        
        // We don't dispatch the next job here. 
        // The Scheduled Command (Cron) will pick this up when next_run_at is passed.
    }
}