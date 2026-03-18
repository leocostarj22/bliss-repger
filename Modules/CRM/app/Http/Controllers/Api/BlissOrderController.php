<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissOrder;

class BlissOrderController extends Controller
{
    public function index(Request $request)
    {
        $search   = trim((string) $request->query('search', ''));
        $statusId = trim((string) $request->query('status_id', ''));

        $q = BlissOrder::query()
            ->with(['status', 'products']);

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

        $rows = $q->orderByDesc('date_added')->get();

        $data = $rows->map(function (BlissOrder $o) {
            return [
                'order_id'        => (string) $o->order_id,
                'invoice_no'      => $o->invoice_no ?: null,
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
                'shipping_method' => $o->shipping_method ?: null,
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
                            'reward'           => isset($p->reward) ? (float) $p->reward : null,
                        ];
                    })->values()
                    : [],
            ];
        })->values();

        return response()->json(['data' => $data]);
    }
}