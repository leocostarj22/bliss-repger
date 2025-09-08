<?php

namespace App\Jobs;

use App\Events\TicketCreated;
use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessTicketBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Ticket $ticket
    ) {}

    public function handle(): void
    {
        broadcast(new TicketCreated($this->ticket));
    }
}
