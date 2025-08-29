<?php

namespace App\Jobs;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessHRBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Model $model,
        public string $eventClass,
        public array $eventData = []
    ) {
        $this->onQueue('broadcasting');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            if (!class_exists($this->eventClass)) {
                throw new \Exception("Classe de evento {$this->eventClass} não encontrada");
            }

            // Criar instância do evento dinamicamente
            $eventInstance = new $this->eventClass($this->model, ...$this->eventData);
            
            broadcast($eventInstance);
            
        } catch (\Exception $e) {
            Log::error('Erro ao processar broadcasting de RH: ' . $e->getMessage(), [
                'model_type' => get_class($this->model),
                'model_id' => $this->model->id,
                'event_class' => $this->eventClass,
                'exception' => $e
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessHRBroadcast falhou', [
            'model_type' => get_class($this->model),
            'model_id' => $this->model->id,
            'event_class' => $this->eventClass,
            'exception' => $exception->getMessage()
        ]);
    }
}