<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissOrderStatus;

class BlissOrderStatusController extends Controller
{
    public function index()
    {
        $langId = (int) config('crm.blissnatura_language_id', 2);

        $rows = BlissOrderStatus::query()
            ->when($langId, fn($q) => $q->where('language_id', $langId))
            ->orderBy('name')
            ->get();

        $data = $rows->map(fn (BlissOrderStatus $s) => [
            'order_status_id' => (string) $s->order_status_id,
            'language_id'     => isset($s->language_id) ? (int) $s->language_id : 0,
            'name'            => $s->name,
        ])->values();

        return response()->json(['data' => $data]);
    }
}