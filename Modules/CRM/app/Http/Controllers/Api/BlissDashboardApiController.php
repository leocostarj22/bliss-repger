<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissOrder;
use Modules\CRM\Models\BlissCustomer;
use Modules\CRM\Models\BlissProduct;

class BlissDashboardApiController extends Controller
{
    public function index()
    {
        $totalOrders    = (int) BlissOrder::count();
        $totalRevenue   = (float) BlissOrder::sum('total');
        $customersCount = (int) BlissCustomer::count();
        $productsCount  = (int) BlissProduct::count();

        $latest = BlissOrder::query()
            ->with(['status', 'products'])
            ->orderByDesc('date_added')
            ->limit(10)
            ->get()
            ->map(function (BlissOrder $o) {
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
                            $prod = \Modules\CRM\Models\BlissProduct::find($p->product_id);
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
                                'image_url'        => $prod?->image_url ?? null,
                            ];
                        })->values()
                        : [],
                ];
            })->values();

        return response()->json([
            'data' => [
                'total_orders'     => $totalOrders,
                'total_revenue'    => $totalRevenue,
                'customers_count'  => $customersCount,
                'products_count'   => $productsCount,
                'latest_orders'    => $latest,
            ],
        ]);
    }
}