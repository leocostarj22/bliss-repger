<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\MyFormulaOrder;

class MyFormulaOrderController extends Controller
{
    public function index(Request $request)
    {
        $search         = trim((string) $request->query('search', ''));
        $statusId       = trim((string) $request->query('status_id', ''));
        $includeUnknown = $request->boolean('include_unknown', false);
        $dedup          = $request->boolean('dedup', true);
        $perPage        = min(100, max(5, (int) $request->query('per_page', 10)));
        $page           = max(1, (int) $request->query('page', 1));

        $q = MyFormulaOrder::query()->with(['status', 'products']);

        if (! $includeUnknown) {
            $q->whereNotIn('order_status_id', [0, '0']);
        }

        if ($statusId !== '') {
            $q->where('order_status_id', $statusId);
        }

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $x->where('order_id', 'like', "%{$search}%")
                  ->orWhere('firstname', 'like', "%{$search}%")
                  ->orWhere('lastname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%");
            });
        }

        $q->orderByDesc('date_added');

        $paginator = $q->paginate($perPage, ['*'], 'page', $page);
        $items = collect($paginator->items());

        if ($dedup) {
            $items = $items->unique(function ($o) {
                $minute = optional($o->date_added)->format('Y-m-d H:i');
                $base = ($o->email ?: ($o->firstname.' '.$o->lastname));
                $inv = $o->invoice_no ? ('INV:'.$o->invoice_no) : null;
                return $inv ?: md5($base.'|'.(string) $o->total.'|'.(string) $minute);
            })->values();
        }

        $data = $items->map(function (MyFormulaOrder $o) {
            return [
                'order_id'        => (string) $o->order_id,
                'invoice_no'      => $o->invoice_no ?: null,
                'store_name'      => $o->store_name ?: 'MyFormula',
                'customer_id'     => (string) $o->customer_id,
                'firstname'       => $o->firstname,
                'lastname'        => $o->lastname,
                'email'           => $o->email,
                'telephone'       => $o->telephone ?: null,
                'total'           => (float) $o->total,
                'order_status_id' => (string) $o->order_status_id,
                'date_added'      => $o->date_added ? $o->date_added->toIso8601String() : null,
                'date_modified'   => $o->date_modified ? $o->date_modified->toIso8601String() : null,
                'payment_method'  => $o->payment_method ?: null,
                'payment_code'    => $o->payment_code ?: null,
                'status'          => $o->relationLoaded('status') && $o->status ? [
                    'order_status_id' => (string) $o->status->order_status_id,
                    'language_id'     => isset($o->status->language_id) ? (int) $o->status->language_id : 0,
                    'name'            => $o->status->name,
                ] : null,
                'products'        => $o->relationLoaded('products')
                    ? $o->products->map(function ($p) {
                        return [
                            'order_product_id' => (string) $p->order_product_id,
                            'order_id'         => (string) $p->order_id,
                            'product_id'       => (string) $p->product_id,
                            'name'             => $p->name,
                            'model'            => $p->model,
                            'quantity'         => (int) $p->quantity,
                            'price'            => (float) $p->price,
                            'total'            => (float) $p->total,
                            'tax'              => isset($p->tax) ? (float) $p->tax : null,
                        ];
                    })->values()
                    : [],
            ];
        })->values();

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => (int) $paginator->total(),
                'page' => (int) $paginator->currentPage(),
                'perPage' => (int) $paginator->perPage(),
                'totalPages' => (int) $paginator->lastPage(),
            ],
        ]);
    }
}