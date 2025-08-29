<?php

namespace App\Jobs;

use App\Models\InternalMessage;
use App\Models\MessageRecipient;
use App\Events\MessageSent;
use App\Events\MessageRead;
use App\Events\MessageReceived;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessMessageBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public InternalMessage $message,
        public string $eventType,
        public ?MessageRecipient $messageRecipient = null
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
                case 'sent':
                    broadcast(new MessageSent($this->message));
                    
                    // Disparar evento MessageReceived para cada destinatário
                    foreach ($this->message->recipients as $recipient) {
                        if ($recipient->recipient_id !== $this->message->sender_id) {
                            broadcast(new MessageReceived($this->message, $recipient->recipient));
                        }
                    }
                    break;
                    
                case 'read':
                    if ($this->messageRecipient && $this->messageRecipient->recipient) {
                        broadcast(new MessageRead(
                            $this->message, 
                            $this->messageRecipient->recipient, 
                            $this->messageRecipient
                        ));
                    }
                    break;
            }
        } catch (\Exception $e) {
            Log::error('Erro ao processar broadcasting de mensagem: ' . $e->getMessage(), [
                'message_id' => $this->message->id,
                'event_type' => $this->eventType,
                'exception' => $e
            ]);
            
            // Re-throw para que o job seja marcado como falhado
            throw $e;
        }
    }

    /**
     * Handle a job failure.
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('Job ProcessMessageBroadcast falhou', [
            'message_id' => $this->message->id,
            'event_type' => $this->eventType,
            'exception' => $exception->getMessage()
        ]);
    }
}