<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissProduct;

class BlissProductController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'all');

        $q = BlissProduct::query()->with('description');

        if ($status !== 'all') {
            $q->where('status', $status === 'active' ? 1 : 0);
        }

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $x->where('model', 'like', "%{$search}%")
                  ->orWhere('product_id', 'like', "%{$search}%")
                  ->orWhereHas('description', function ($d) use ($search) {
                      $d->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $rows = $q->orderByDesc('date_modified')->orderByDesc('date_added')->get();

        $data = $rows->map(function (BlissProduct $p) {
            return [
                'product_id'    => (string) $p->product_id,
                'model'         => $p->model,
                'price'         => $p->price !== null ? (float) $p->price : null,
                'quantity'      => $p->quantity !== null ? (int) $p->quantity : null,
                'status'        => (bool) ($p->status ?? true),
                'date_added'    => $p->date_added ? $p->date_added->toIso8601String() : null,
                'date_modified' => $p->date_modified ? $p->date_modified->toIso8601String() : null,
                'image'         => $p->image,
                'image_url'     => $p->image_url,
                'description'   => $p->relationLoaded('description') && $p->description
                    ? [
                        'product_id'  => (string) $p->description->product_id,
                        'language_id' => (int) $p->description->language_id,
                        'name'        => $p->description->name,
                        'description' => $p->description->description,
                    ]
                    : null,
            ];
        })->values();

        return response()->json(['data' => $data]);
    }
}