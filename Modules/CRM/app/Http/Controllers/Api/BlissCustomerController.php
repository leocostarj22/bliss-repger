<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Modules\CRM\Models\BlissCustomer;
use Modules\CRM\Models\Contact;

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

    public function exportToContacts(Request $request)
    {
        $ids = $request->input('customer_ids', []);
        if (!is_array($ids) || empty($ids)) {
            return response()->json(['message' => 'customer_ids é obrigatório'], 422);
        }

        $customers = BlissCustomer::whereIn('customer_id', $ids)->get();

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
                if (empty($contact->source)) $contact->source = 'bliss_natura';
                if (method_exists($contact, 'trashed') && $contact->trashed()) $contact->restore();
                $contact->save();
                $updated[] = (int) $contact->id;
                $contactIds[] = (int) $contact->id;
            } else {
                $new = Contact::create([
                    'name'   => $name !== '' ? $name : $email,
                    'email'  => $email,
                    'phone'  => $phone,
                    'status' => 'subscribed',
                    'source' => 'bliss_natura',
                    'tags'   => [],
                ]);
                $created[] = (int) $new->id;
                $contactIds[] = (int) $new->id;
            }
        }

        return response()->json([
            'data' => [
                'created_count' => count($created),
                'updated_count' => count($updated),
                'contact_ids'   => $contactIds,
            ],
        ]);
    }
}