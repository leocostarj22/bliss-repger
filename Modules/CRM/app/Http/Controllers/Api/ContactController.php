<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Modules\CRM\Models\Contact;
use Modules\CRM\Models\Delivery;

class ContactController extends Controller
{
    /**
     * Get list of contacts.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Contact::query();

        // Status Filter
        if ($request->filled('status') && $request->status !== 'all') {
            // Simple mapping or direct usage. 
            // If frontend sends 'subscribed', we might need to match 'prospect'/'lead'/'customer' 
            // OR just return all active ones. 
            // For now, let's ignore strict status mapping and just filter if it matches exactly,
            // or return all if status is 'subscribed' (assuming all in DB are subscribed).
            if ($request->status === 'bounced') {
                 // Logic for bounced contacts if we had a status field for that
                 // or check bounce history
            }
        }

        // Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Source Filter
        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        // Tag Filter
        if ($request->filled('tag')) {
            $query->whereJsonContains('tags', $request->tag);
        }

        // Pagination
        $perPage = $request->input('perPage', 10);
        $contacts = $query->orderBy('created_at', 'desc')->paginate($perPage);

        // Transform data
        $data = $contacts->map(function ($contact) {
            return $this->transformContact($contact);
        });

        return response()->json([
            'data' => $data,
            'meta' => [
                'total' => $contacts->total(),
                'page' => $contacts->currentPage(),
                'perPage' => $contacts->perPage(),
                'totalPages' => $contacts->lastPage(),
            ]
        ]);
    }

    /**
     * Store a newly created contact.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email|unique:contacts,email',
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'status' => 'nullable|string|in:subscribed,unsubscribed,bounced',
            'source' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
        ]);

        $contact = Contact::create($validated);

        return response()->json(['data' => $this->transformContact($contact)], 201);
    }

    public function import(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'file' => 'required|file|max:102400|mimes:xlsx,xls,csv',
            'source' => 'required|string|max:100',
            'deduplicate' => 'nullable|boolean',
        ]);

        $source = trim((string) $validated['source']);
        $deduplicate = (bool) ($validated['deduplicate'] ?? true);

        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        $storedPath = $request->file('file')->store('imports', 'local');
        $fullPath = Storage::disk('local')->path($storedPath);
        $ext = strtolower(pathinfo($fullPath, PATHINFO_EXTENSION));

        $normalizeHeader = function (string $h): string {
            $norm = Str::of($h)->lower()->trim()->toString();
            $norm = Str::of($norm)->replaceMatches('/[\s_-]+/', ' ')->toString();
            $norm = Str::of($norm)->replace(' ', '_')->toString();

            $map = [
                'nome' => 'name',
                'name' => 'name',
                'contact' => 'name',
                'email' => 'email',
                'e_mail' => 'email',
                'e-mail' => 'email',
                'telefone' => 'phone',
                'telemovel' => 'phone',
                'celular' => 'phone',
                'phone' => 'phone',
                'mobile' => 'phone',
                'tags' => 'tags',
                'tag' => 'tags',
                'status' => 'status',
                'estado' => 'status',
                'first_name' => 'first_name',
                'firstname' => 'first_name',
                'primeiro_nome' => 'first_name',
                'last_name' => 'last_name',
                'lastname' => 'last_name',
                'sobrenome' => 'last_name',
            ];

            return $map[$norm] ?? $norm;
        };

        $normalizeText = function ($val) {
            if (!is_string($val)) return $val;
            $val = trim($val);
            if ($val === '') return $val;

            if (function_exists('mb_check_encoding') && !mb_check_encoding($val, 'UTF-8')) {
                $candidates = [
                    @iconv('Windows-1252', 'UTF-8//IGNORE', $val),
                    @iconv('ISO-8859-1', 'UTF-8//IGNORE', $val),
                    @utf8_encode($val),
                ];
                foreach ($candidates as $c) {
                    if (is_string($c) && $c !== '') return $c;
                }
            }

            return $val;
        };

        $normalizeEmail = fn($email) => $email ? strtolower(trim((string) $email)) : null;

        $headers = [];
        $imported = 0;
        $updated = 0;
        $invalid = 0;
        $skipped = 0;
        $duplicatesInFile = 0;
        $seen = [];

        $batch = [];
        $batchSize = 1000;

        $flushBatch = function () use (&$batch, &$imported, &$updated, $deduplicate) {
            if (empty($batch)) {
                return;
            }

            $now = now();
            $emails = array_values(array_unique(array_map(fn($r) => $r['email'], $batch)));

            $existingByEmail = Contact::withTrashed()
                ->whereIn(DB::raw('LOWER(email)'), $emails)
                ->get(['id', 'email'])
                ->mapWithKeys(fn($c) => [strtolower((string) $c->email) => (int) $c->id]);

            $insertRows = [];

            DB::transaction(function () use (&$batch, &$imported, &$updated, &$insertRows, $existingByEmail, $now, $deduplicate) {
                foreach ($batch as $row) {
                    $id = $existingByEmail[$row['email']] ?? null;

                    if ($id) {
                        if ($deduplicate) {
                            Contact::withTrashed()->where('id', $id)->update([
                                'name' => $row['name'],
                                'phone' => $row['phone'],
                                'source' => $row['source'],
                                'status' => $row['status'],
                                'tags' => json_encode($row['tags'], JSON_UNESCAPED_UNICODE),
                                'deleted_at' => null,
                                'updated_at' => $now,
                            ]);
                            $updated++;
                        } else {
                            $insertRows[] = [
                                'email' => $row['email'],
                                'name' => $row['name'],
                                'phone' => $row['phone'],
                                'source' => $row['source'],
                                'status' => $row['status'],
                                'tags' => json_encode($row['tags'], JSON_UNESCAPED_UNICODE),
                                'created_at' => $now,
                                'updated_at' => $now,
                            ];
                        }

                        continue;
                    }

                    $insertRows[] = [
                        'email' => $row['email'],
                        'name' => $row['name'],
                        'phone' => $row['phone'],
                        'source' => $row['source'],
                        'status' => $row['status'],
                        'tags' => json_encode($row['tags'], JSON_UNESCAPED_UNICODE),
                        'created_at' => $now,
                        'updated_at' => $now,
                    ];
                }

                if (!empty($insertRows)) {
                    Contact::insert($insertRows);
                    $imported += count($insertRows);
                }
            });

            $batch = [];
        };

        $processRow = function (array $rowAssoc) use (
            &$invalid,
            &$duplicatesInFile,
            &$seen,
            &$batch,
            $batchSize,
            $flushBatch,
            $source,
            $normalizeEmail,
            $normalizeText
        ) {
            $email = $normalizeEmail($rowAssoc['email'] ?? null);
            if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
                $invalid++;
                return;
            }

            if (isset($seen[$email])) {
                $duplicatesInFile++;
                return;
            }
            $seen[$email] = true;

            $name = $rowAssoc['name'] ?? null;
            if (!is_string($name) || trim($name) === '') {
                $first = $rowAssoc['first_name'] ?? null;
                $last = $rowAssoc['last_name'] ?? null;
                $candidate = trim((string) ($first ?? '') . ' ' . (string) ($last ?? ''));
                $name = $candidate !== '' ? $candidate : $email;
            }
            $name = (string) $normalizeText($name);

            $phone = $rowAssoc['phone'] ?? null;
            $phone = is_string($phone) ? trim($phone) : ($phone !== null ? trim((string) $phone) : null);

            $status = strtolower(trim((string) ($rowAssoc['status'] ?? 'subscribed')));
            if (!in_array($status, ['subscribed', 'unsubscribed', 'bounced'], true)) {
                $status = 'subscribed';
            }

            $tags = [];
            $rawTags = $rowAssoc['tags'] ?? null;
            if (is_array($rawTags)) {
                $tags = array_values(array_filter(array_map(fn($t) => is_string($t) ? trim($t) : '', $rawTags)));
            } elseif (is_string($rawTags)) {
                $parts = preg_split('/[;,]+/', $rawTags) ?: [];
                $tags = array_values(array_filter(array_map(fn($t) => trim((string) $t), $parts)));
            }

            $batch[] = [
                'email' => $email,
                'name' => $name,
                'phone' => $phone,
                'source' => $source,
                'status' => $status,
                'tags' => $tags,
            ];

            if (count($batch) >= $batchSize) {
                $flushBatch();
            }
        };

        try {
            if ($ext === 'xlsx' && class_exists(\OpenSpout\Reader\XLSX\Reader::class)) {
                $reader = new \OpenSpout\Reader\XLSX\Reader();
                $reader->open($fullPath);

                foreach ($reader->getSheetIterator() as $sheet) {
                    $isHeaderProcessed = false;

                    foreach ($sheet->getRowIterator() as $row) {
                        $values = array_map(fn($cell) => $cell->getValue(), $row->getCells());
                        $values = array_map(fn($v) => is_string($v) ? $normalizeText($v) : $v, $values);

                        if (! $isHeaderProcessed) {
                            $headers = array_map(fn($h) => $normalizeHeader((string) $h), $values);
                            $isHeaderProcessed = true;
                            continue;
                        }

                        if (empty($headers)) {
                            $skipped++;
                            continue;
                        }

                        $rowAssoc = [];
                        foreach ($values as $i => $val) {
                            $key = $headers[$i] ?? 'col_'.$i;
                            if (!array_key_exists($key, $rowAssoc)) {
                                $rowAssoc[$key] = is_string($val) ? trim((string) $val) : $val;
                            }
                        }

                        $processRow($rowAssoc);
                    }

                    break;
                }

                $reader->close();
            } else {
                if (! class_exists(\PhpOffice\PhpSpreadsheet\IOFactory::class)) {
                    return response()->json(['message' => 'Biblioteca de Excel ausente no servidor.'], 500);
                }

                $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($fullPath);
                $worksheet = $spreadsheet->getActiveSheet();
                $isHeaderProcessed = false;

                foreach ($worksheet->getRowIterator() as $row) {
                    $cellIterator = $row->getCellIterator();
                    $cellIterator->setIterateOnlyExistingCells(false);

                    $values = [];
                    foreach ($cellIterator as $cell) {
                        $raw = $cell->getValue();
                        $values[] = is_string($raw) ? $normalizeText(trim((string) $raw)) : $raw;
                    }

                    if (! $isHeaderProcessed) {
                        $headers = array_map(fn($h) => $normalizeHeader((string) $h), $values);
                        $isHeaderProcessed = true;
                        continue;
                    }

                    if (empty($headers)) {
                        $skipped++;
                        continue;
                    }

                    $rowAssoc = [];
                    foreach ($values as $i => $val) {
                        $key = $headers[$i] ?? 'col_'.$i;
                        if (!array_key_exists($key, $rowAssoc)) {
                            $rowAssoc[$key] = is_string($val) ? trim((string) $val) : $val;
                        }
                    }

                    $processRow($rowAssoc);
                }
            }

            $flushBatch();
        } finally {
            try {
                Storage::disk('local')->delete($storedPath);
            } catch (\Throwable $e) {
            }
        }

        return response()->json(['data' => [
            'imported' => $imported,
            'updated' => $updated,
            'invalid' => $invalid,
            'skipped' => $skipped,
            'duplicatesInFile' => $duplicatesInFile,
        ]]);
    }

    /**
     * Show the specified contact.
     */
    public function show($id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        return response()->json(['data' => $this->transformContact($contact)]);
    }

    /**
     * Update the specified contact.
     */
    public function update(Request $request, $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);

        $validated = $request->validate([
            'email' => 'sometimes|email|unique:contacts,email,' . $id,
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'status' => 'sometimes|string|in:subscribed,unsubscribed,bounced',
            'source' => 'nullable|string|max:100',
            'tags' => 'nullable|array',
        ]);

        $contact->update($validated);

        return response()->json(['data' => $this->transformContact($contact)]);
    }

    /**
     * Remove the specified contact.
     */
    public function destroy($id): JsonResponse
    {
        $contact = Contact::withTrashed()->findOrFail($id);
        $contact->forceDelete();

        return response()->json(null, 204);
    }

    public function bulkDestroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source' => 'required|string|max:100',
        ]);

        $source = trim((string) $validated['source']);

        $deleted = Contact::withTrashed()->where('source', $source)->forceDelete();

        return response()->json(['data' => [
            'deleted' => (int) $deleted,
        ]]);
    }

    /**
     * Add a tag to the contact.
     */
    public function addTag(Request $request, $id): JsonResponse
    {
        $request->validate(['tag' => 'required|string|max:50']);
        $contact = Contact::findOrFail($id);
        
        $tags = $contact->tags ?? [];
        if (!in_array($request->tag, $tags)) {
            $tags[] = $request->tag;
            $contact->tags = $tags;
            $contact->save();
        }

        return response()->json(['data' => $this->transformContact($contact)]);
    }

    /**
     * Remove a tag from the contact.
     */
    public function removeTag(Request $request, $id): JsonResponse
    {
        $request->validate(['tag' => 'required|string|max:50']);
        $contact = Contact::findOrFail($id);
        
        $tags = $contact->tags ?? [];
        $tags = array_values(array_filter($tags, fn($t) => $t !== $request->tag));
        
        $contact->tags = $tags;
        $contact->save();

        return response()->json(['data' => $this->transformContact($contact)]);
    }

    private function transformContact($contact)
    {
        // Calculate individual stats
        $sent = Delivery::where('contact_id', $contact->id)->whereNotNull('sent_at')->count();
        $opened = Delivery::where('contact_id', $contact->id)->whereNotNull('opened_at')->count();
        $clicked = Delivery::where('contact_id', $contact->id)->whereNotNull('clicked_at')->count();

        $nameParts = explode(' ', $contact->name, 2);
        $firstName = $nameParts[0];
        $lastName = $nameParts[1] ?? '';

        return [
            'id' => (string)$contact->id,
            'email' => $contact->email,
            'firstName' => $firstName,
            'lastName' => $lastName,
            'name' => $contact->name,
            'phone' => $contact->phone,
            'source' => $contact->source,
            'tags' => $contact->tags ?? [], 
            'listIds' => [], 
            'status' => $contact->status ?? 'subscribed',
            'createdAt' => $contact->created_at->toIso8601String(),
            'lastActivity' => $contact->updated_at->toIso8601String(),
            'openRate' => $sent > 0 ? round(($opened / $sent) * 100, 1) : 0,
            'clickRate' => $sent > 0 ? round(($clicked / $sent) * 100, 1) : 0,
        ];
    }
}