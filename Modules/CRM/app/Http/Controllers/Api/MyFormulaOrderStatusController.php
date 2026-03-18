<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Modules\CRM\Models\MyFormulaOrderStatus;

class MyFormulaOrderStatusController extends Controller
{
    public function index()
    {
        $rows = MyFormulaOrderStatus::query()
            ->where('language_id', 2)
            ->orderBy('name')
            ->get()
            ->map(function ($s) {
                return [
                    'order_status_id' => (string) $s->order_status_id,
                    'language_id'     => (int) $s->language_id,
                    'name'            => $s->name,
                ];
            })->values();

        return response()->json(['data' => $rows]);
    }
}