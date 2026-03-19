<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\MyFormulaCustomer;
use Modules\CRM\Models\Contact;
use Illuminate\Support\Facades\Log;

class MyFormulaCustomerController extends Controller
{
    public function index(Request $request)
    {
        try {
            $search   = trim((string) $request->query('search', ''));
            $status   = trim((string) $request->query('status', 'all'));
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

            $paginator = $q->orderByDesc('date_added')->paginate($perPage, ['*'], 'page', $page);

            $items = collect($paginator->items())->map(function (MyFormulaCustomer $c) {
                $rawDate = $c->date_added;
                $date = null;
                if ($rawDate instanceof \DateTimeInterface) {
                    $date = $rawDate->format(DATE_ATOM);
                } elseif (is_string($rawDate) && $rawDate !== '') {
                    try { $date = \Carbon\Carbon::parse($rawDate)->toIso8601String(); } catch (\Throwable) { $date = null; }
                }

                return [
                    'customer_id' => (string) $c->customer_id,
                    'firstname'   => (string) ($c->firstname ?? ''),
                    'lastname'    => (string) ($c->lastname ?? ''),
                    'email'       => (string) ($c->email ?? ''),
                    'telephone'   => $c->telephone ?: null,
                    'status'      => isset($c->status) ? (bool) $c->status : null,
                    'date_added'  => $date,
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
        } catch (\Throwable $e) {
            Log::error('MyFormula customers index failed', ['error' => $e->getMessage()]);
            return response()->json([
                'data' => [],
                'meta' => ['page' => 1, 'per_page' => 10, 'total' => 0, 'total_pages' => 1],
            ]);
        }
    }

    public function exportToContacts(Request $request)
    {
        try {
            $ids = $request->input('customer_ids', []);
            if (!is_array($ids) || empty($ids)) {
                return response()->json(['message' => 'customer_ids é obrigatório'], 422);
            }

            $customers = MyFormulaCustomer::whereIn('customer_id', $ids)->get();
            $created = [];
            $updated = [];
            $contactIds = [];

            foreach ($customers as $c) {
                $email = strtolower(trim((string) $c->email));
                if (!$email) continue;
                $name = trim(($c->firstname ?? '') . ' ' . ($c->lastname ?? ''));
                $phone = $c->telephone ? trim((string) $c->telephone) : null;

                $contact = Contact::withTrashed()->whereRaw('LOWER(email) = ?', [$email])->first();
                if ($contact) {
                    $contact->name = $name !== '' ? $name : ($contact->name ?? $email);
                    if ($phone) $contact->phone = $phone;
                    if (empty($contact->status)) $contact->status = 'subscribed';
                    if (empty($contact->source)) $contact->source = 'myformula';
                    if (method_exists($contact, 'trashed') && $contact->trashed()) $contact->restore();
                    $contact->save();
                    $updated[] = (int) $contact->id;
                    $contactIds[] = (int) $contact->id;
                } else {
                    $new = Contact::create([
                        'name' => $name !== '' ? $name : $email,
                        'email' => $email,
                        'phone' => $phone,
                        'status' => 'subscribed',
                        'source' => 'myformula',
                        'tags' => [],
                    ]);
                    $created[] = (int) $new->id;
                    $contactIds[] = (int) $new->id;
                }
            }

            return response()->json([
                'data' => [
                    'created_count' => count($created),
                    'updated_count' => count($updated),
                    'contact_ids' => $contactIds,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('MyFormula customers export failed', ['error' => $e->getMessage()]);
            return response()->json(['data' => ['created_count' => 0, 'updated_count' => 0, 'contact_ids' => []]]);
        }
    }
}