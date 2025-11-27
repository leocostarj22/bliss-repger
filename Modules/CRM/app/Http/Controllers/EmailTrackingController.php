<?php

namespace Modules\CRM\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\URL;
use Modules\CRM\Models\Delivery;

class EmailTrackingController extends Controller
{
    public function pixel(Delivery $delivery)
    {
        if (is_null($delivery->opened_at)) {
            $delivery->opened_at = now();
            $delivery->status = 'opened';
            $delivery->save();
            Log::info('crm.track.opened', ['delivery_id' => $delivery->id]);
        } else {
            Log::info('crm.track.opened.already', ['delivery_id' => $delivery->id]);
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

    public function click(Delivery $delivery, Request $request)
    {
        $raw = $request->query('url');
        if (! $raw) {
            return redirect()->to('/');
        }

        $url = is_string($raw) ? urldecode($raw) : $raw;
        $url = trim($url);
        if ($url === '') {
            return redirect()->to('/');
        }

        if (parse_url($url, PHP_URL_SCHEME) === null) {
            $url = url($url);
        }

        $host = parse_url($url, PHP_URL_HOST);
        $appHost = parse_url(config('app.url'), PHP_URL_HOST);
        $allowedHosts = array_values(array_filter([$appHost, 'www.gmcentral.pt', 'gmcentral.pt']));
        if ($host && ! in_array($host, $allowedHosts, true)) {
            Log::warning('crm.track.blocked', ['delivery_id' => $delivery->id, 'url' => $url, 'host' => $host]);
            return redirect()->to('/');
        }

        if (is_null($delivery->clicked_at)) {
            $delivery->clicked_at = now();
            $delivery->status = 'clicked';
            $delivery->clicked_url = $url;
            $delivery->save();
            Log::info('crm.track.clicked', ['delivery_id' => $delivery->id, 'url' => $url]);
        } else {
            Log::info('crm.track.clicked.already', ['delivery_id' => $delivery->id, 'url' => $url]);
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