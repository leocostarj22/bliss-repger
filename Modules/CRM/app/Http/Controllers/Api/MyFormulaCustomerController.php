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

    private function assertMyFormulaSalesAccess(): void
    {
        $user = auth()->user();
        $allowed = false;

        if ($user) {
            if (method_exists($user, 'isAdmin') && $user->isAdmin()) {
                $allowed = true;
            } else {
                $role = strtolower(trim((string) ($user->role ?? '')));
                $isEmployee = in_array($role, ['employee', 'funcionario', 'funcionário', 'colaborador'], true);

                if ($isEmployee) {
                    $companyOk = false;

                    try {
                        if ($user->company && strtolower((string) ($user->company->slug ?? '')) === 'myformula') {
                            $companyOk = true;
                        }
                    } catch (\Throwable) {
                        $companyOk = false;
                    }

                    if (! $companyOk) {
                        try {
                            $companyOk = $user->companies()->where('slug', 'myformula')->exists();
                        } catch (\Throwable) {
                            $companyOk = false;
                        }
                    }

                    $allowed = $companyOk;
                }
            }
        }

        abort_unless($allowed, 403);
    }

    private function phoneDigits(string $raw): string
    {
        $digits = preg_replace('/\D+/', '', $raw);
        return $digits ? $digits : '';
    }

    private function makeFakeEmail(string $telephone): string
    {
        $digits = $this->phoneDigits($telephone);
        if ($digits === '') {
            $digits = (string) random_int(100000, 999999);
        }

        $base = 'tel' . $digits;
        $email = strtolower($base . '@myformula.invalid');

        if (! MyFormulaCustomer::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return $email;
        }

        for ($i = 0; $i < 10; $i++) {
            $suffix = (string) random_int(100, 999);
            $candidate = strtolower($base . '+' . $suffix . '@myformula.invalid');
            if (! MyFormulaCustomer::whereRaw('LOWER(email) = ?', [$candidate])->exists()) {
                return $candidate;
            }
        }

        return strtolower($base . '+' . uniqid() . '@myformula.invalid');
    }

    public function store(Request $request)
    {
        $this->assertMyFormulaSalesAccess();

        try {
            $telephone = trim((string) $request->input('telephone', ''));
            if ($telephone === '') {
                return response()->json(['message' => 'telephone é obrigatório'], 422);
            }

            $firstname = trim((string) $request->input('firstname', ''));
            $lastname = trim((string) $request->input('lastname', ''));
            $email = strtolower(trim((string) $request->input('email', '')));

            if ($firstname === '') {
                $firstname = 'Cliente';
            }

            if ($email === '') {
                $email = $this->makeFakeEmail($telephone);
            }

            if (MyFormulaCustomer::whereRaw('LOWER(email) = ?', [$email])->exists()) {
                return response()->json(['message' => 'Já existe um cliente com este email'], 422);
            }

            $row = MyFormulaCustomer::create([
                'firstname' => $firstname,
                'lastname' => $lastname,
                'email' => $email,
                'telephone' => $telephone,
                'status' => 1,
                'date_added' => now(),
            ]);

            return response()->json([
                'data' => [
                    'customer_id' => (string) $row->customer_id,
                    'firstname' => (string) ($row->firstname ?? ''),
                    'lastname' => (string) ($row->lastname ?? ''),
                    'email' => (string) ($row->email ?? ''),
                    'telephone' => $row->telephone ?: null,
                    'status' => isset($row->status) ? (bool) $row->status : null,
                    'date_added' => $row->date_added ? $row->date_added->toIso8601String() : null,
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error('MyFormula customers store failed', ['error' => $e->getMessage()]);
            return response()->json(['message' => 'Não foi possível criar o cliente'], 500);
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