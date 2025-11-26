<?php

namespace Modules\CRM\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Modules\CRM\Models\Delivery;

class EmailTrackingController extends Controller
{
    public function pixel(Delivery $delivery)
    {
        if (is_null($delivery->opened_at)) {
            $delivery->update(['opened_at' => now()]);
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

        if (is_null($delivery->clicked_at)) {
            $delivery->update(['clicked_at' => now()]);
        }

        return redirect()->away($url);
    }
}