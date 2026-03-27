<?php

namespace App\Services\Sms;

use RuntimeException;

class SmsService
{
    public function send(string $to, string $message): string
    {
        $provider = strtolower(trim((string) config('services.sms.provider', 'nos')));

        if ($provider !== 'nos') {
            throw new RuntimeException('Provider SMS não suportado');
        }

        return app(NosSmsClient::class)->send($to, $message);
    }
}