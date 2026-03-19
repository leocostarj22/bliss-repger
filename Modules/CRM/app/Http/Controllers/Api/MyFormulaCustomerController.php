<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\MyFormulaCustomer;

class MyFormulaCustomerController extends Controller
{
    public function index(Request $request)
    {
        $search   = trim((string) $request->query('search', ''));
        $status   = trim((string) $request->query('status', 'all')); // 'all' | 'active' | 'inactive'
        $perPage  = min(100, max(5, (int) $request->query('per_page', 10)));
        $page     = max(1, (int) $request->query('page', 1));

        $q = MyFormulaCustomer::query();

        if ($status === 'active') {
            $q->where('status', 1);
        } elseif ($status === 'inactive') {
            $q->where('status', 0);
        }

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $x->where('customer_id', 'like', "%{$search}%")
                  ->orWhere('firstname', 'like', "%{$search}%")
                  ->orWhere('lastname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%");
            });
        }

        $q->orderByDesc('date_added');

        $paginator = $q->paginate($perPage, ['*'], 'page', $page);

        $items = collect($paginator->items())->map(function (MyFormulaCustomer $c) {
            return [
                'customer_id' => (string) $c->customer_id,
                'firstname'   => $c->firstname,
                'lastname'    => $c->lastname,
                'email'       => $c->email,
                'telephone'   => $c->telephone ?: null,
                'status'      => isset($c->status) ? (bool) $c->status : null,
                'date_added'  => $c->date_added ? $c->date_added->toIso8601String() : null,
            ];
        })->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'page'        => (int) $paginator->currentPage(),
                'per_page'    => (int) $paginator->perPage(),
                'total'       => (int) $paginator->total(),
                'total_pages' => (int) $paginator->lastPage(),
            ],
        ]);
    }
}