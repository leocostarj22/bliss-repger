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

        $rowsBySlug = [];
        $totals = ['morning' => 0, 'afternoon' => 0, 'night' => 0];
        foreach ($planSupplements as $i => $slugRaw) {
            $slug = (string) $slugRaw;
            $mask = (int) ($intakePeriods[$i] ?? 1);
            $period = ($mask & 4) ? 'night' : (($mask & 2) ? 'afternoon' : 'morning');
            $name = $supplementNames[$slug] ?? $slug;
            if (! isset($rowsBySlug[$slug])) {
                $rowsBySlug[$slug] = ['name' => $name, 'morning' => 0, 'afternoon' => 0, 'night' => 0, 'total' => 0];
            }
            $rowsBySlug[$slug][$period]++;
            $rowsBySlug[$slug]['total']++;
            $totals[$period]++;
        }

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

        $reportData = [
            'plan_number' => (string) ($order->getAttribute('plan_name_letters') ?? ''),
            'month_number' => '',
            'plan_name' => trim(((string) ($order->getAttribute('plan_name_letters') ?? '')) . ' ' . ((string) ($order->products->first()->name ?? ''))),
            'capsules' => (string) ($order->getAttribute('capsules') ?? ''),
            'supplement_rows' => array_values($rowsBySlug),
            'totals' => $totals,
            'how_to_take' => trim(collect([
                $totals['morning'] > 0 ? "{$totals['morning']} cápsulas pela manhã" : null,
                $totals['afternoon'] > 0 ? "{$totals['afternoon']} cápsulas à tarde" : null,
                $totals['night'] > 0 ? "{$totals['night']} cápsulas à noite" : null,
            ])->filter()->implode(', ')),
            'birthdate' => $birthdateFormatted,
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
