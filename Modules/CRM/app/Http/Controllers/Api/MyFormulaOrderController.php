<?php

namespace Modules\CRM\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Modules\CRM\Models\MyFormulaOrder;
use Modules\CRM\Models\Quiz;

class MyFormulaOrderController extends Controller
{
    public function index(Request $request)
    {
        $search         = trim((string) $request->query('search', ''));
        $statusId       = trim((string) $request->query('status_id', ''));
        $includeUnknown = $request->boolean('include_unknown', false);
        $dedup          = $request->boolean('dedup', true);
        $perPage        = min(100, max(5, (int) $request->query('per_page', 10)));
        $page           = max(1, (int) $request->query('page', 1));

        $q = MyFormulaOrder::query()->with(['status', 'products']);

        if (! $includeUnknown) {
            $q->whereNotIn('order_status_id', [0, '0']);
        }

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

        $q->orderByDesc('date_added');

        $paginator = $q->paginate($perPage, ['*'], 'page', $page);
        $items = collect($paginator->items());

        if ($dedup) {
            $items = $items->unique(function ($o) {
                $minute = optional($o->date_added)->format('Y-m-d H:i');
                $base = ($o->email ?: ($o->firstname.' '.$o->lastname));
                $inv = $o->invoice_no ? ('INV:'.$o->invoice_no) : null;
                return $inv ?: md5($base.'|'.(string) $o->total.'|'.(string) $minute);
            })->values();
        }

        $data = $items->map(function (MyFormulaOrder $o) {
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
            'data' => $data,
            'meta' => [
                'total' => (int) $paginator->total(),
                'page' => (int) $paginator->currentPage(),
                'perPage' => (int) $paginator->perPage(),
                'totalPages' => (int) $paginator->lastPage(),
            ],
        ]);
    }

    public function show($id)
    {
        $o = MyFormulaOrder::with(['status', 'products'])->where('order_id', $id)->firstOrFail();

        $data = [
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

        return response()->json(['data' => $data]);
    }

    public function purchaseReport($id)
    {
        $order = MyFormulaOrder::with(['products.options', 'customer', 'status', 'customFields'])
            ->where('order_id', $id)
            ->firstOrFail();

        $decodeArray = static function ($value): array {
            if (is_array($value)) return $value;
            if (! is_string($value) || trim($value) === '') return [];

            $json = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
                return $json;
            }

            $unserialized = @unserialize($value);
            return is_array($unserialized) ? $unserialized : [];
        };

        $quiz = null;
        if (! empty($order->quiz_id)) {
            $quiz = Quiz::find((int) $order->quiz_id);
        }
        if (! $quiz) {
            $quiz = Quiz::where('post->email', $order->email)->latest('date_added')->first();
        }

        $quizPost = is_array($quiz?->post) ? $quiz->post : [];
        $planSupplements = $decodeArray($order->getAttribute('supplements'));
        $intakePeriods = $decodeArray($order->getAttribute('intake_periods'));

        $supplementNames = [];
        if (! empty($planSupplements)) {
            $supplementNames = DB::connection('myformula')
                ->table('plans_supplements as s')
                ->join('plans_supplements_description as sd', 'sd.supplement_id', '=', 's.supplement_id')
                ->where('sd.language_id', 2)
                ->whereIn('s.slug', array_values(array_unique(array_map('strval', $planSupplements))))
                ->pluck('sd.name', 's.slug')
                ->toArray();
        }

        $morning = [];
        $afternoon = [];
        $night = [];

        foreach ($planSupplements as $i => $slugRaw) {
            $slug = (string) $slugRaw;
            $mask = (int) ($intakePeriods[$i] ?? 1);
            $sel = ($mask & 1) ? 1 : (($mask & 2) ? 2 : (($mask & 4) ? 4 : 0));
            if (! $sel) {
                $sel = 1;
            }

            $item = [
                'slug' => $slug,
                'name' => $supplementNames[$slug] ?? $slug,
            ];

            switch ($sel) {
                case 2:
                    $afternoon[] = $item;
                    break;
                case 4:
                    $night[] = $item;
                    break;
                case 1:
                default:
                    $morning[] = $item;
                    break;
            }
        }

        $totals = [
            'morning' => count($morning),
            'afternoon' => count($afternoon),
            'night' => count($night),
        ];

        $supplementsByPeriod = [
            ['title' => 'Manhã', 'items' => $morning],
            ['title' => 'Tarde', 'items' => $afternoon],
            ['title' => 'Noite', 'items' => $night],
        ];

        $extractNifFromCustomFields = static function (array $arr, array $nifIds): ?string {
            if (! $arr) return null;

            foreach ($arr as $k => $v) {
                if (is_numeric($k) && in_array((int) $k, $nifIds, true)) {
                    return is_array($v) ? (string) ($v['value'] ?? reset($v) ?? '') : (string) $v;
                }
            }

            foreach ($arr as $item) {
                if (is_array($item) && isset($item['custom_field_id']) && in_array((int) $item['custom_field_id'], $nifIds, true)) {
                    return (string) ($item['value'] ?? '');
                }
            }

            $flat = new \RecursiveIteratorIterator(new \RecursiveArrayIterator($arr));
            foreach ($flat as $key => $value) {
                $k = strtolower((string) $key);
                if (str_contains($k, 'nif') || in_array($k, ['vat', 'tax_id', 'taxid'], true)) {
                    return (string) $value;
                }
            }

            return null;
        };

        $paymentCustom = $decodeArray($order->getAttribute('payment_custom_field'));
        $shippingCustom = $decodeArray($order->getAttribute('shipping_custom_field'));
        $customerCustom = $decodeArray($order->getAttribute('custom_field'));

        $nifFieldIds = DB::connection('myformula')
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

        $nifValue = $extractNifFromCustomFields($paymentCustom, $nifFieldIds)
            ?: $extractNifFromCustomFields($shippingCustom, $nifFieldIds)
            ?: $extractNifFromCustomFields($customerCustom, $nifFieldIds)
            ?: '';

        $birthdate = $quizPost['birthdate'] ?? null;
        $birthdateFormatted = $birthdate ? date('d/m/Y', strtotime((string) $birthdate)) : '';

        $firstProduct = $order->products->first();
        $productId = $firstProduct->product_id ?? null;
        $planName = (string) ($firstProduct->name ?? '');

        $productInfo = null;
        if ($productId) {
            $productInfo = DB::connection('myformula')
                ->table('product')
                ->select('capsules', 'taking_information')
                ->where('product_id', $productId)
                ->first();
        }

        $capsulesVal = (string) ($productInfo->capsules ?? '');
        if ($capsulesVal === '') {
            $capsulesVal = (string) ($order->getAttribute('capsules') ?? '');
        }

        $planLetters = (string) ($order->getAttribute('plan_name_letters') ?? '');

        $clientCode = $order->customer_id
            ? ('C.' . str_pad((string) $order->customer_id, 7, '0', STR_PAD_LEFT))
            : ('O.' . str_pad((string) $order->order_id, 7, '0', STR_PAD_LEFT));

        $reportDate = '';
        if (! empty($quiz?->date_added)) {
            $reportDate = date('d/m/Y H:i', strtotime((string) $quiz->date_added));
        }

        $netWeightValRaw = $order->getAttribute('net_weight');
        $netWeightVal = is_null($netWeightValRaw) ? '' : trim((string) $netWeightValRaw);

        $netWeightNum = is_numeric(str_replace([',', ' '], ['.', ''], $netWeightVal))
            ? (float) str_replace(',', '.', $netWeightVal)
            : 0.0;

        if ($netWeightVal === '' || $netWeightNum <= 0) {
            $uniqueSlugs = array_values(array_unique(array_map('strval', $planSupplements)));
            if ($uniqueSlugs) {
                $weights = DB::connection('myformula')
                    ->table('plans_supplements')
                    ->select('slug', 'weight', 'unit')
                    ->whereIn('slug', $uniqueSlugs)
                    ->get();

                $gramsPerDay = 0.0;
                foreach ($weights as $w) {
                    $weight = (float) $w->weight;
                    $unit = strtolower((string) $w->unit);

                    $gramsPerDay += match ($unit) {
                        'g' => $weight,
                        'mg' => $weight / 1000.0,
                        'micro' => $weight / 1000000.0,
                        'kg' => $weight * 1000.0,
                        default => $weight,
                    };
                }

                $totalGrams = round($gramsPerDay * 28, 0);
                if ($totalGrams > 0) {
                    $netWeightVal = (string) $totalGrams . ' g';
                }
            }
        } elseif (! preg_match('/[a-z]/i', $netWeightVal)) {
            $netWeightVal = $netWeightVal . ' g';
        }

        $takingInfo = (string) ($productInfo->taking_information ?? '');

        $parseStatusIds = static function ($val): array {
            if (is_array($val)) return array_map('intval', $val);
            if (is_numeric($val)) return [(int) $val];
            if (! is_string($val) || trim($val) === '') return [];

            $json = json_decode($val, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($json)) {
                return array_map('intval', $json);
            }

            $arr = @unserialize($val);
            return is_array($arr) ? array_map('intval', $arr) : [];
        };

        $settings = DB::connection('myformula')
            ->table('setting')
            ->whereIn('key', ['config_processing_status', 'config_complete_status'])
            ->pluck('value', 'key');

        $processingIds = $parseStatusIds($settings['config_processing_status'] ?? null);
        $completeIds = $parseStatusIds($settings['config_complete_status'] ?? null);
        $statusIds = array_values(array_unique(array_merge($processingIds, $completeIds)));

        $paymentDateRaw = null;
        if ($statusIds) {
            $paymentDateRaw = DB::connection('myformula')
                ->table('order_history')
                ->where('order_id', $order->order_id)
                ->whereIn('order_status_id', $statusIds)
                ->orderBy('date_added')
                ->value('date_added');
        }

        $paymentDate = $paymentDateRaw
            ? date('d/m/Y H:i', strtotime((string) $paymentDateRaw))
            : (! empty($order->getAttribute('approval_date'))
                ? date('d/m/Y H:i', strtotime((string) $order->getAttribute('approval_date')))
                : '');

        $reportData = [
            'client_code' => $clientCode,
            'plan_letters' => $planLetters,
            'plan_number' => (string) ($order->getAttribute('lot_number') ?? ''),
            'month_number' => '',
            'plan_name' => $planName,
            'capsules' => $capsulesVal,
            'net_weight' => $netWeightVal,
            'supplements_by_period' => $supplementsByPeriod,
            'totals' => $totals,
            'how_to_take' => $takingInfo,
            'birthdate' => $birthdateFormatted,
            'report_date' => $reportDate,
            'nif' => $nifValue,
            'payment_method' => (string) ($order->payment_method ?? ''),
            'payment_date' => $paymentDate,
        ];

        $orderData = [
            'order_id' => (string) $order->order_id,
            'invoice_no' => $order->invoice_no ?: null,
            'store_name' => $order->store_name ?: 'MyFormula',
            'customer_id' => (string) $order->customer_id,
            'firstname' => $order->firstname,
            'lastname' => $order->lastname,
            'email' => $order->email,
            'telephone' => $order->telephone ?: null,
            'total' => (float) $order->total,
            'order_status_id' => (string) $order->order_status_id,
            'date_added' => $order->date_added ? $order->date_added->toIso8601String() : null,
            'date_modified' => $order->date_modified ? $order->date_modified->toIso8601String() : null,
            'payment_method' => $order->payment_method ?: null,
            'payment_code' => $order->payment_code ?: null,
            'status' => $order->relationLoaded('status') && $order->status ? [
                'order_status_id' => (string) $order->status->order_status_id,
                'language_id' => isset($order->status->language_id) ? (int) $order->status->language_id : 0,
                'name' => $order->status->name,
            ] : null,
            'products' => $order->relationLoaded('products')
                ? $order->products->map(function ($p) {
                    return [
                        'order_product_id' => (string) $p->order_product_id,
                        'order_id' => (string) $p->order_id,
                        'product_id' => (string) $p->product_id,
                        'name' => $p->name,
                        'model' => $p->model,
                        'quantity' => (int) $p->quantity,
                        'price' => (float) $p->price,
                        'total' => (float) $p->total,
                        'tax' => isset($p->tax) ? (float) $p->tax : null,
                    ];
                })->values()
                : [],
        ];

        return response()->json([
            'data' => [
                'order' => $orderData,
                'reportData' => $reportData,
            ],
        ]);
    }
}