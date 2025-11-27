<?php

namespace Modules\CRM\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Modules\CRM\Models\Delivery;

class EmailTrackingController extends Controller
{
    public function pixel($delivery)
    {
        $model = Delivery::find($delivery);
        if ($model) {
            if (is_null($model->opened_at)) {
                $model->opened_at = now();
                $model->status = 'opened';
                $model->save();
                Log::info('crm.track.opened', ['delivery_id' => $model->id]);
            } else {
                Log::info('crm.track.opened.already', ['delivery_id' => $model->id]);
            }
        }

        $pixel = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NkYGBgAAAABQAB' .
            'JzQnTwAAAABJRU5ErkJggg=='
        );

        return response($pixel, 200)
            ->header('Content-Type', 'image/png')
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0');
    }

    public function click($delivery, Request $request)
    {
        $model = Delivery::find($delivery);

        $raw = $request->query('url');
        if (! $raw) {
            return redirect()->to('/');
        }

        $url = is_string($raw) ? urldecode($raw) : $raw;
        $url = trim($url);
        if ($url === '') {
            return redirect()->to('/');
        }

        $parts = parse_url($url);
        if ($parts !== false && isset($parts['query'])) {
            parse_str($parts['query'], $q);
            $parts['query'] = http_build_query($q);
            $url = (isset($parts['scheme']) ? $parts['scheme'] . '://' : '') .
                   ($parts['host'] ?? '') .
                   ($parts['path'] ?? '') .
                   (!empty($parts['query']) ? '?' . $parts['query'] : '') .
                   (isset($parts['fragment']) ? '#' . $parts['fragment'] : '');
        }

        Log::info('crm.track.click.incoming', ['delivery_id' => $model?->id ?? $delivery, 'raw' => $raw, 'decoded' => $url]);

        if (parse_url($url, PHP_URL_SCHEME) === null) {
            $url = url($url);
        }

        $hostNorm = parse_url($url, PHP_URL_HOST);
        if ($hostNorm && in_array($hostNorm, ['www.gmcentral.pt','gmcentral.pt'], true)) {
            $url = preg_replace('#/index\.html(?=/|$)#', '/', $url);
        }

        $host = parse_url($url, PHP_URL_HOST);
        $appHost = parse_url(config('app.url'), PHP_URL_HOST);
        $allowedHosts = array_values(array_filter([$appHost, 'www.gmcentral.pt', 'gmcentral.pt']));
        if ($host && ! in_array($host, $allowedHosts, true)) {
            Log::warning('crm.track.blocked', ['delivery_id' => $model?->id ?? $delivery, 'url' => $url, 'host' => $host]);
            return redirect()->to('/');
        }

        if ($model && is_null($model->clicked_at)) {
            $model->clicked_at = now();
            $model->status = 'clicked';
            $model->clicked_url = $url;
            $model->save();
            Log::info('crm.track.clicked', ['delivery_id' => $model->id, 'url' => $url]);
        } else {
            Log::info('crm.track.clicked.already', ['delivery_id' => $model?->id ?? $delivery, 'url' => $url]);
        }

        return redirect()->away($url);
    }

    public function unsubscribe(Delivery $delivery)
    {
        if (is_null($delivery->unsubscribed_at)) {
            $delivery->unsubscribed_at = now();
            $delivery->status = 'unsubscribed';
            $delivery->save();
            Log::info('crm.track.unsubscribed', ['delivery_id' => $delivery->id]);
        } else {
            Log::info('crm.track.unsubscribed.already', ['delivery_id' => $delivery->id]);
        }

        return response('You have been unsubscribed.', 200);
    }
}