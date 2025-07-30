<?php

namespace App\Console\Commands;

use App\Models\InternalMessage;
use Illuminate\Console\Command;

class SendScheduledMessages extends Command
{
    protected $signature = 'messages:send-scheduled';
    
    protected $description = 'Send scheduled internal messages';

    public function handle()
    {
        $messages = InternalMessage::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        foreach ($messages as $message) {
            $message->update([
                'status' => 'sent',
                'sent_at' => now(),
            ]);
            
            // Enviar notificações para os destinatários
            // Implementar lógica de notificação
        }

        $this->info("Enviadas {$messages->count()} mensagens agendadas.");
    }
}