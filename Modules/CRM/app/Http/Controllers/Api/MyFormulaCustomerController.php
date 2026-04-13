<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Modules\CRM\Models\MyFormulaCustomer;
use Modules\CRM\Models\Contact;

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
        $user = auth('web')->user() ?? auth('employee')->user();
        if (! $user) {
            abort(401);
        }

        if ($user instanceof \App\Models\EmployeeUser) {
            $allowed = strtolower((string) ($user->employee?->company?->slug ?? '')) === 'myformula';
            abort_unless($allowed, 403);
            return;
        }

        if (! ($user instanceof \App\Models\User)) {
            abort(401);
        }

        if ($user->isAdmin()) {
            return;
        }

        $role = strtolower(trim((string) ($user->role ?? '')));
        $isEmployee = in_array($role, ['employee', 'funcionario', 'funcionário', 'colaborador'], true);
        abort_unless($isEmployee, 403);

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

        abort_unless($companyOk, 403);
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

    private function hashOcPassword(string $password, ?string &$saltOut = null): string
    {
        $hasSalt = false;
        try {
            $hasSalt = Schema::connection('myformula')->hasColumn('customer', 'salt');
        } catch (\Throwable) {
            $hasSalt = false;
        }

        if ($hasSalt) {
            $salt = substr(bin2hex(random_bytes(8)), 0, 9);
            $saltOut = $salt;
            return sha1($salt . sha1($salt . sha1($password)));
        }

        $saltOut = null;
        return password_hash($password, PASSWORD_BCRYPT);
    }

    private function resolveCountryId(string $country): int
    {
        $name = trim($country);
        if ($name === '') return 0;

        try {
            $id = DB::connection('myformula')
                ->table('country')
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->value('country_id');
            if ($id !== null) return (int) $id;

            $id2 = DB::connection('myformula')
                ->table('country')
                ->where('name', 'like', '%' . $name . '%')
                ->orderBy('country_id')
                ->value('country_id');
            return $id2 !== null ? (int) $id2 : 0;
        } catch (\Throwable) {
            return 0;
        }
    }

    private function resolveZoneId(int $countryId, string $district): int
    {
        $name = trim($district);
        if ($countryId <= 0 || $name === '') return 0;

        try {
            $id = DB::connection('myformula')
                ->table('zone')
                ->where('country_id', $countryId)
                ->whereRaw('LOWER(name) = ?', [strtolower($name)])
                ->value('zone_id');
            if ($id !== null) return (int) $id;

            $id2 = DB::connection('myformula')
                ->table('zone')
                ->where('country_id', $countryId)
                ->where('name', 'like', '%' . $name . '%')
                ->orderBy('zone_id')
                ->value('zone_id');
            return $id2 !== null ? (int) $id2 : 0;
        } catch (\Throwable) {
            return 0;
        }
    }

    private function buildCustomerCustomField(?string $nif): ?string
    {
        $val = trim((string) ($nif ?? ''));
        if ($val === '') return null;

        try {
            $ids = DB::connection('myformula')
                ->table('custom_field as cf')
                ->join('custom_field_description as cfd', function ($join) {
                    $join->on('cfd.custom_field_id', '=', 'cf.custom_field_id')
                        ->where('cfd.language_id', 2);
                })
                ->where('cf.status', 1)
                ->where('cfd.name', 'like', '%NIF%')
                ->pluck('cf.custom_field_id')
                ->map(fn ($id) => (int) $id)
                ->toArray();

            if (! $ids) return null;

            $payload = [];
            foreach ($ids as $id) {
                $payload[$id] = $val;
            }

            return serialize($payload);
        } catch (\Throwable) {
            return null;
        }
    }

    public function store(Request $request)
    {
        $this->assertMyFormulaSalesAccess();

        $validated = $request->validate([
            'firstname' => ['required', 'string', 'max:255'],
            'lastname' => ['required', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255', 'required_without:telephone'],
            'nif' => ['nullable', 'string', 'max:64'],
            'telephone' => ['nullable', 'string', 'max:64', 'required_without:email'],
            'address.company' => ['nullable', 'string', 'max:255'],
            'address.address_1' => ['required', 'string', 'max:255'],
            'address.city' => ['required', 'string', 'max:255'],
            'address.postcode' => ['required', 'string', 'max:32'],
            'address.country' => ['required', 'string', 'max:128'],
            'address.district' => ['required', 'string', 'max:128'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        try {
            $telephone = trim((string) ($validated['telephone'] ?? ''));
            $firstname = trim((string) ($validated['firstname'] ?? ''));
            $lastname = trim((string) ($validated['lastname'] ?? ''));
            $email = strtolower(trim((string) ($validated['email'] ?? '')));

            if ($email === '') {
                $email = $this->makeFakeEmail($telephone);
            }

            if ($telephone === '') {
                $telephone = '';
            }

            if (MyFormulaCustomer::whereRaw('LOWER(email) = ?', [$email])->exists()) {
                return response()->json(['message' => 'Já existe um cliente com este email'], 422);
            }

            $customField = null;
            try {
                $hasCustomField = Schema::connection('myformula')->hasColumn('customer', 'custom_field');
                if ($hasCustomField) {
                    $customField = $this->buildCustomerCustomField($validated['nif'] ?? null);
                }
            } catch (\Throwable) {
                $customField = null;
            }

            $now = now();
            $salt = null;
            $hashed = $this->hashOcPassword((string) $validated['password'], $salt);

            $customerInsert = [
                'firstname' => $firstname,
                'lastname' => $lastname,
                'email' => $email,
                'telephone' => $telephone,
                'status' => 1,
                'date_added' => $now,
            ];

            $candidateCols = [
                'customer_group_id' => 1,
                'store_id' => 0,
                'newsletter' => 0,
                'safe' => 0,
                'approved' => 1,
                'address_id' => 0,
                'fax' => '',
                'token' => '',
                'code' => '',
                'ip' => (string) $request->ip(),
                'date_modified' => $now,
                'password' => $hashed,
                'salt' => $salt ?? '',
                'custom_field' => $customField ?? '',
            ];

            foreach ($candidateCols as $col => $value) {
                try {
                    if (Schema::connection('myformula')->hasColumn('customer', $col)) {
                        $customerInsert[$col] = $value;
                    }
                } catch (\Throwable) {
                }
            }

            $address = is_array($validated['address'] ?? null) ? $validated['address'] : [];
            $companyName = trim((string) ($address['company'] ?? ''));
            $address1 = trim((string) ($address['address_1'] ?? ''));
            $city = trim((string) ($address['city'] ?? ''));
            $postcode = trim((string) ($address['postcode'] ?? ''));
            $countryName = trim((string) ($address['country'] ?? ''));
            $districtName = trim((string) ($address['district'] ?? ''));

            $countryId = $this->resolveCountryId($countryName);
            if ($countryId <= 0) {
                return response()->json(['message' => 'País inválido'], 422);
            }

            $zoneId = $this->resolveZoneId($countryId, $districtName);
            if (trim($districtName) !== '' && $zoneId <= 0 && strtolower($countryName) === 'portugal') {
                return response()->json(['message' => 'Distrito inválido'], 422);
            }

            $customerCols = null;
            $addressCols = null;
            try {
                $customerCols = Schema::connection('myformula')->getColumnListing('customer');
                $addressCols = Schema::connection('myformula')->getColumnListing('address');
            } catch (\Throwable) {
                $customerCols = null;
                $addressCols = null;
            }

            $hasCustomerCol = static fn ($col) => is_array($customerCols) && in_array($col, $customerCols, true);
            $hasAddressCol = static fn ($col) => is_array($addressCols) && in_array($col, $addressCols, true);

            $customerId = null;
            $addressId = null;

            DB::connection('myformula')->transaction(function () use (
                &$customerId,
                &$addressId,
                $customerInsert,
                $firstname,
                $lastname,
                $companyName,
                $address1,
                $city,
                $postcode,
                $countryId,
                $zoneId,
                $hasCustomerCol,
                $hasAddressCol
            ) {
                $customerId = DB::connection('myformula')->table('customer')->insertGetId($customerInsert);

                $addrInsert = [
                    'customer_id' => $customerId,
                    'firstname' => $firstname,
                    'lastname' => $lastname,
                    'company' => $companyName,
                    'address_1' => $address1,
                    'city' => $city,
                    'postcode' => $postcode,
                    'country_id' => $countryId,
                    'zone_id' => $zoneId,
                ];

                $candidateAddrCols = [
                    'address_2' => '',
                    'custom_field' => '',
                    'company_id' => 0,
                    'tax_id' => '',
                ];

                foreach ($candidateAddrCols as $col => $value) {
                    if ($hasAddressCol($col)) {
                        $addrInsert[$col] = $value;
                    }
                }

                $filtered = [];
                foreach ($addrInsert as $col => $value) {
                    if ($hasAddressCol($col)) {
                        $filtered[$col] = $value;
                    }
                }

                if (! $filtered) {
                    $filtered = $addrInsert;
                }

                $addressId = DB::connection('myformula')->table('address')->insertGetId($filtered);

                if ($hasCustomerCol('address_id')) {
                    DB::connection('myformula')
                        ->table('customer')
                        ->where('customer_id', $customerId)
                        ->update(['address_id' => $addressId]);
                }
            });

            $row = MyFormulaCustomer::query()->where('customer_id', $customerId)->first();

            return response()->json([
                'data' => [
                    'customer_id' => (string) ($row?->customer_id ?? $customerId ?? ''),
                    'firstname' => (string) ($row?->firstname ?? $firstname),
                    'lastname' => (string) ($row?->lastname ?? $lastname),
                    'email' => (string) ($row?->email ?? $email),
                    'telephone' => $row?->telephone ?: null,
                    'status' => isset($row?->status) ? (bool) $row?->status : true,
                    'date_added' => $row?->date_added ? $row->date_added->toIso8601String() : null,
                ],
            ], 201);
        } catch (\Throwable $e) {
            Log::error('MyFormula customers store failed', [
                'error' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);
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