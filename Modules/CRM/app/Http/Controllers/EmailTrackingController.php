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

        return response($pixel, 200)->header('Content-Type', 'image/png');
    }

    public function click(Delivery $delivery, Request $request)
    {
        $url = $request->query('url');
        if (! $url) {
            return redirect()->to('/');
        }

        if (parse_url($url, PHP_URL_SCHEME) === null) {
            $url = url($url);
        }

        if (is_null($delivery->clicked_at)) {
            $delivery->clicked_at = now();
            $delivery->status = 'clicked';
            $delivery->save();
            Log::info('crm.track.clicked', ['delivery_id' => $delivery->id, 'url' => $url]);
        } else {
            Log::info('crm.track.clicked.already', ['delivery_id' => $delivery->id, 'url' => $url]);
        }

        return redirect()->away($url);
    }
}