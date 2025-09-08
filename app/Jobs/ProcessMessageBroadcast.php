<?php

namespace App\Jobs;

use App\Events\MessageSent;
use App\Models\InternalMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class ProcessMessageBroadcast implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public InternalMessage $message
    ) {}

    public function handle(): void
    {
        broadcast(new MessageSent($this->message));
    }
}
