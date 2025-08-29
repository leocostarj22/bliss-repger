<?php

namespace App\Jobs;

use App\Models\Ticket;
use App\Events\TicketCreated;
use App\Events\TicketUpdated;
use App\Events\TicketStatusChanged;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessTicketBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Ticket $ticket,
        public string $eventType,
        public ?string $oldStatus = null,
        public ?array $changes = null
    ) {
        $this->onQueue('broadcasting');
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        try {
            switch ($this->eventType) {
                case 'created':
                    broadcast(new TicketCreated($this->ticket));
                    break;
                    
                case 'updated':
                    broadcast(new TicketUpdated($this->ticket, $this->changes ?? []));
                    break;
                    
                case 'status_changed':
                    if ($this->oldStatus === null) {
                        throw new \InvalidArgumentException('oldStatus é obrigatório para evento status_changed');
                    }
                    broadcast(new TicketStatusChanged(
                        $this->ticket, 
                        $this->oldStatus, 
                        $this->ticket->status
                    ));
                    break;
                    
                default:
                    throw new \InvalidArgumentException("Tipo de evento inválido: {$this->eventType}");
            }
            
            Log::info('Broadcasting de ticket processado com sucesso', [
                'ticket_id' => $this->ticket->id,
                'event_type' => $this->eventType
            ]);
            
        } catch (\Exception $e) {
            Log::error('Erro ao processar broadcasting de ticket: ' . $e->getMessage(), [
                'ticket_id' => $this->ticket->id,
                'event_type' => $this->eventType,
                'old_status' => $this->oldStatus,
                'current_status' => $this->ticket->status,
                'exception' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessTicketBroadcast falhou', [
            'ticket_id' => $this->ticket->id,
            'event_type' => $this->eventType,
            'old_status' => $this->oldStatus,
            'current_status' => $this->ticket->status,
            'exception' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}