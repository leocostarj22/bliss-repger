<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissCustomer;

class BlissCustomerController extends Controller
{
    public function index(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $status = (string) $request->query('status', 'all');

        $q = BlissCustomer::query();

        if ($status !== 'all') {
            $q->where('status', $status === 'active' ? 1 : 0);
        }

        if ($search !== '') {
            $q->where(function ($x) use ($search) {
                $x->where('firstname', 'like', "%{$search}%")
                  ->orWhere('lastname', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%")
                  ->orWhere('customer_id', 'like', "%{$search}%");
            });
        }

        $rows = $q->orderByDesc('date_added')->get();

        $data = $rows->map(function (BlissCustomer $c) {
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

        return response()->json(['data' => $data]);
    }
}