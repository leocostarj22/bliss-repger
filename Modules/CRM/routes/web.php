<?php

use Illuminate\Support\Facades\Route;
use Modules\CRM\Http\Controllers\CRMController;
use Modules\CRM\Http\Controllers\EmailTrackingController;

Route::middleware(['auth', 'verified'])->prefix('admin/crm')->group(function () {
    Route::resource('crms', CRMController::class)->names('crm');

    Route::get('myformula/orders/{order}/purchase-report', function ($orderId) {
        $order = \Modules\CRM\Models\MyFormulaOrder::with(['products.options', 'customer', 'status', 'customFields'])->find($orderId);
        if (! $order) abort(404);

        $decodeArray = static function ($value): array {
            if (is_array($value)) return $value;
            if (! is_string($value) || trim($value) === '') return [];
            $json = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($json)) return $json;
            $unserialized = @unserialize($value);
            return is_array($unserialized) ? $unserialized : [];
        };

        $quiz = null;
        if (! empty($order->quiz_id)) {
            $quiz = \Modules\CRM\Models\Quiz::find((int) $order->quiz_id);
        }
        if (! $quiz) {
            $quiz = \Modules\CRM\Models\Quiz::where('post->email', $order->email)->latest('date_added')->first();
        }

        $quizPost = is_array($quiz?->post) ? $quiz->post : [];
        $planSupplements = $decodeArray($order->getAttribute('supplements'));
        $intakePeriods = $decodeArray($order->getAttribute('intake_periods'));

        $supplementNames = [];
        if (! empty($planSupplements)) {
            $supplementNames = \Illuminate\Support\Facades\DB::connection('myformula')
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
            $sel  = ($mask & 1) ? 1 : (($mask & 2) ? 2 : (($mask & 4) ? 4 : 0));
            if (! $sel) { $sel = 1; }
            $item = [
                'slug' => $slug,
                'name' => $supplementNames[$slug] ?? $slug,
            ];
            switch ($sel) {
                case 2: $afternoon[] = $item; break;
                case 4: $night[] = $item; break;
                case 1:
                default: $morning[] = $item; break;
            }
        }
        $totals = [
            'morning' => count($morning),
            'afternoon' => count($afternoon),
            'night' => count($night),
        ];
        $supplements_by_period = [
            ['title' => 'Manhã', 'items' => $morning],
            ['title' => 'Tarde', 'items' => $afternoon],
            ['title' => 'Noite', 'items' => $night],
        ];

        $extractNif = static function (array $arr) {
            $flat = new \RecursiveIteratorIterator(new \RecursiveArrayIterator($arr));
            foreach ($flat as $key => $value) {
                $k = strtolower((string) $key);
                if (in_array($k, ['nif', 'vat', 'tax_id', 'taxid'], true)) return (string) $value;
            }
            return null;
        };

        $paymentCustom = $decodeArray($order->getAttribute('payment_custom_field'));
        $birthdate = $quizPost['birthdate'] ?? null;
        $birthdateFormatted = $birthdate ? date('d/m/Y', strtotime((string) $birthdate)) : '';

        $firstProduct = $order->products->first();
        $productId = $firstProduct->product_id ?? null;
        $planName = (string) ($firstProduct->name ?? '');
        $productInfo = null;
        if ($productId) {
            $productInfo = \Illuminate\Support\Facades\DB::connection('myformula')
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
        if (!empty($quiz?->date_added)) {
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
                $subs = \Illuminate\Support\Facades\DB::connection('myformula')
                    ->table('plans_supplements as sup')
                    ->join('plans_supplements_substances as assoc', 'assoc.supplement_id', '=', 'sup.supplement_id')
                    ->select('sup.slug', 'assoc.quantity', 'assoc.unit')
                    ->whereIn('sup.slug', $uniqueSlugs)
                    ->get();

                $mgPerCapsule = 0.0;
                foreach ($subs as $r) {
                    $q = (float) $r->quantity;
                    $unit = strtolower((string) $r->unit);
                    if ($unit === 'micro') { $q = $q / 1000.0; }
                    $mgPerCapsule += $q;
                }

                $capsPerDay = (int) preg_replace('/\D+/', '', (string) $capsulesVal);
                $grams = ($mgPerCapsule * $capsPerDay * 28) / 1000.0;
                if ($grams > 0) {
                    $netWeightVal = rtrim(rtrim(number_format($grams, 2, ',', ''), '0'), ',') . ' g';
                }
            }
        } elseif (! preg_match('/[a-z]/i', $netWeightVal)) {
            $netWeightVal = $netWeightVal . ' g';
        }

        $takingInfo = (string) ($productInfo->taking_information ?? '');

        $reportData = [
            'client_code' => $clientCode,
            'plan_letters' => $planLetters,
            'plan_number' => (string) ($order->getAttribute('lot_number') ?? ''),
            'month_number' => '',
            'plan_name' => $planName,
            'capsules' => $capsulesVal,
            'net_weight' => $netWeightVal,
            'supplements_by_period' => $supplements_by_period,
            'totals' => $totals,
            'how_to_take' => $takingInfo,
            'birthdate' => $birthdateFormatted,
            'report_date' => $reportDate,
            'nif' => $extractNif($paymentCustom) ?: '',
            'payment_method' => (string) ($order->payment_method ?? ''),
            'payment_date' => ! empty($order->getAttribute('approval_date')) ? date('d/m/Y H:i', strtotime((string) $order->getAttribute('approval_date'))) : '',
        ];

        return view('crm::myformula.purchase-report', compact('order', 'reportData'));
    })->name('crm.myformula.purchase-report');
    
    Route::get('/app/{any?}', function () {
        return view('crm::app');
    })->where('any', '.*')->name('crm.app');
});

Route::get('crm/track/pixel/{delivery}', [EmailTrackingController::class, 'pixel'])->name('crm.track.pixel');
Route::get('crm/track/click/{delivery}', [EmailTrackingController::class, 'click'])->name('crm.track.click');
Route::get('crm/track/unsubscribe/{delivery}', [EmailTrackingController::class, 'unsubscribe'])->name('crm.track.unsubscribe');

Route::get('crm/debug/{id}', function ($id) {
    $campaign = \Modules\CRM\Models\Campaign::find($id);
    if (!$campaign) return 'Campaign not found';
    
    $resolver = new \Modules\CRM\Services\SegmentResolver();
    $contacts = $campaign->segment_id ? $resolver->resolveContacts($campaign->segment_id) : collect();
    
    $deliveries = \Modules\CRM\Models\Delivery::where('campaign_id', $id)->get();
    
    return [
        'campaign' => $campaign->toArray(),
        'diagnostics' => [
            'is_scheduled' => $campaign->status === 'scheduled',
            'is_due' => $campaign->scheduled_at <= now(),
            'server_time' => now()->toDateTimeString(),
            'scheduled_at' => $campaign->scheduled_at?->toDateTimeString(),
            'channel_check' => $campaign->channel === 'email',
            'segment_check' => $campaign->segment_id ? 'present' : 'missing',
            'contacts_count' => $contacts->count(),
            'contacts_sample' => $contacts->take(3)->pluck('email'),
            'deliveries_count' => $deliveries->count(),
        ],
        'stats' => [
            'total' => $deliveries->count(),
            'status_counts' => $deliveries->groupBy('status')->map->count(),
        ],
    ];
});
