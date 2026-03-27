<?php

namespace App\Services\Sms;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

class NosSmsClient
{
    private ?string $cachedToken = null;

    public function isEnabled(): bool
    {
        return (bool) config('services.sms.enabled', false);
    }

    public function send(string $to, string $message): string
    {
        if (! $this->isEnabled()) {
            throw new RuntimeException('SMS desativado');
        }

        $endpoint = rtrim((string) config('services.nos_sms.endpoint', ''), '/');
        $version = trim((string) config('services.nos_sms.version', 'v1'));
        $sender = trim((string) config('services.nos_sms.sender', ''));
        $apiKey = trim((string) config('services.nos_sms.key', ''));
        $secret = trim((string) config('services.nos_sms.secret', ''));

        if (! $endpoint || ! $version || ! $sender || ! $apiKey || ! $secret) {
            throw new RuntimeException('Configuração NOS SMS incompleta');
        }

        $toNorm = $this->normalizeToE164($to);
        $token = $this->getAccessToken($endpoint, $version, $apiKey, $secret);

        $verify = filter_var(config('services.nos_sms.verify_ssl', true), FILTER_VALIDATE_BOOL);
        $timeout = (int) config('services.nos_sms.timeout', 60);
        $connectTimeout = (int) config('services.nos_sms.connect_timeout', 10);

        $url = $endpoint . '/communication/' . $version . '/sms';

        $response = Http::baseUrl($endpoint)
            ->withOptions([
                'verify' => $verify,
            ])
            ->timeout($timeout)
            ->connectTimeout($connectTimeout)
            ->acceptJson()
            ->withToken($token)
            ->withHeaders([
                'X-ApiKey' => $apiKey,
            ])
            ->post('/communication/' . $version . '/sms', [
                'recipients' => [
                    ['to' => $toNorm],
                ],
                'sender' => $sender,
                'body' => $message,
            ]);

        $status = $response->status();
        $json = null;

        try {
            $json = $response->json();
        } catch (Throwable) {
            $json = null;
        }

        if ($status !== 202) {
            $err = is_array($json) ? ($json['Error'] ?? $json['message'] ?? null) : null;
            $err = is_string($err) && trim($err) ? $err : 'Falha ao enviar SMS';
            throw new RuntimeException($err);
        }

        $externalId = is_array($json) ? ($json['externalId'] ?? null) : null;
        if (! is_string($externalId) || ! trim($externalId)) {
            throw new RuntimeException('Resposta NOS inválida (externalId ausente)');
        }

        return $externalId;
    }

    private function getAccessToken(string $endpoint, string $version, string $apiKey, string $secret): string
    {
        if ($this->cachedToken) return $this->cachedToken;

        $cacheKey = 'nos_sms:access_token';
        $cached = Cache::get($cacheKey);
        if (is_string($cached) && trim($cached)) {
            $this->cachedToken = $cached;
            return $cached;
        }

        $verify = filter_var(config('services.nos_sms.verify_ssl', true), FILTER_VALIDATE_BOOL);
        $timeout = (int) config('services.nos_sms.timeout', 60);
        $connectTimeout = (int) config('services.nos_sms.connect_timeout', 10);

        $response = Http::baseUrl($endpoint)
            ->withOptions([
                'verify' => $verify,
            ])
            ->timeout($timeout)
            ->connectTimeout($connectTimeout)
            ->acceptJson()
            ->post('/common/' . $version . '/auth/accessToken', [
                'key' => $apiKey,
                'secret' => $secret,
            ]);

        $json = null;
        try {
            $json = $response->json();
        } catch (Throwable) {
            $json = null;
        }

        if (! $response->ok() || ! is_array($json)) {
            throw new RuntimeException('Falha ao autenticar NOS SMS');
        }

        $token = $json['access_token'] ?? null;
        $issuedAt = $json['issued_at'] ?? null;
        $expiresIn = $json['expires_in'] ?? null;

        if (! is_string($token) || ! trim($token)) {
            throw new RuntimeException('Token NOS inválido');
        }

        $ttlUntil = now()->addMinutes(50);

        if (is_numeric($issuedAt) && is_numeric($expiresIn)) {
            $expiresAt = CarbonImmutable::createFromTimestampMs((int) $issuedAt)->addSeconds((int) $expiresIn);
            $ttlUntil = $expiresAt->subMinutes(5);
            if ($ttlUntil->lessThanOrEqualTo(now())) {
                $ttlUntil = now()->addMinutes(1);
            }
        }

        Cache::put($cacheKey, $token, $ttlUntil);
        $this->cachedToken = $token;

        return $token;
    }

    private function normalizeToE164(string $to): string
    {
        $raw = trim($to);
        if ($raw === '') return $raw;

        $digits = preg_replace('/[^\d+]/', '', $raw) ?? $raw;
        $digits = trim($digits);

        if ($digits === '') return $raw;

        if (str_starts_with($digits, '+')) {
            return '+' . preg_replace('/\D/', '', substr($digits, 1));
        }

        if (str_starts_with($digits, '00')) {
            return '+' . preg_replace('/\D/', '', substr($digits, 2));
        }

        $onlyDigits = preg_replace('/\D/', '', $digits) ?? $digits;

        if (str_starts_with($onlyDigits, '351')) {
            return '+' . $onlyDigits;
        }

        $defaultCc = trim((string) config('services.sms.default_country_code', '+351'));
        if ($defaultCc !== '' && ! str_starts_with($defaultCc, '+')) {
            $defaultCc = '+' . preg_replace('/\D/', '', $defaultCc);
        }

        if (preg_match('/^\d{9}$/', $onlyDigits) && $defaultCc) {
            return $defaultCc . $onlyDigits;
        }

        return $onlyDigits;
    }
}