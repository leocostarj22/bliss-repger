<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Modules\CRM\Models\MyFormulaOrder;
use Modules\CRM\Models\MyFormulaCustomer;
use Modules\CRM\Models\MyFormulaProduct;
use Modules\CRM\Models\MyFormulaOrderStatus;
use Modules\CRM\Models\Quiz;

class MyFormulaDashboardApiController extends Controller
{
    public function index()
    {
        $ordersCount     = (int) MyFormulaOrder::count();
        $totalRevenue    = (float) (MyFormulaOrder::sum('total') ?? 0);
        $customersCount  = (int) MyFormulaCustomer::count();
        $productsCount   = (int) MyFormulaProduct::count();

        $quizzesCount        = (int) Quiz::count();
        $completedQuizzes    = (int) Quiz::where('post->step', 'plans')->count();

        $top = MyFormulaOrder::query()
            ->select('order_status_id', DB::raw('count(*) as c'))
            ->groupBy('order_status_id')
            ->orderByDesc('c')
            ->limit(4)
            ->get();

        $statusNames = MyFormulaOrderStatus::query()
            ->where('language_id', 2)
            ->whereIn('order_status_id', $top->pluck('order_status_id')->all())
            ->get()
            ->keyBy('order_status_id');

        $topStatuses = $top->map(function ($row) use ($statusNames) {
            $id = (string) $row->order_status_id;
            $name = $statusNames->has($id) ? $statusNames[$id]->name : $id;
            return [
                'order_status_id' => $id,
                'name' => $name,
                'count' => (int) $row->c,
            ];
        })->values();

        $latest = MyFormulaOrder::query()
            ->with(['status' => function ($q) {
                $q->where('language_id', 2);
            }, 'products'])
            ->orderByDesc('date_added')
            ->limit(8)
            ->get()
            ->map(function (MyFormulaOrder $o) {
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
            'data' => [
                'orders_count'      => $ordersCount,
                'total_revenue'     => $totalRevenue,
                'customers_count'   => $customersCount,
                'products_count'    => $productsCount,
                'quizzes_count'     => $quizzesCount,
                'completed_quizzes' => $completedQuizzes,
                'top_statuses'      => $topStatuses,
                'latest_orders'     => $latest,
            ],
        ]);
    }
}