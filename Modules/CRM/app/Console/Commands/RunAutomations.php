<?php

namespace Modules\CRM\Console\Commands;

use Illuminate\Console\Command;
use Modules\CRM\Models\AutomationExecution;
use Modules\CRM\Jobs\ProcessAutomationStep;
use Illuminate\Support\Facades\Log;

class RunAutomations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'crm:run-automations';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Checks for pending automation steps and executes them.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        // Find executions that are 'waiting' and whose next_run_at has passed
        $executions = AutomationExecution::where('status', 'waiting')
            ->whereNotNull('next_run_at')
            ->where('next_run_at', '<=', now())
            ->get();

        if ($executions->count() > 0) {
            $this->info("Found {$executions->count()} pending automations. Dispatching jobs...");
            
            foreach ($executions as $execution) {
                // Update status to prevent double processing
                $execution->update(['status' => 'queued']);
                
                // Dispatch the job to process the NEXT step
                // The ProcessAutomationStep job will figure out the next node based on current_node_id
                ProcessAutomationStep::dispatch($execution);
                
                $this->info("Dispatched execution ID: {$execution->id}");
            }
        } else {
            $this->info('No pending automations found.');
        }

        return 0;
    }
}