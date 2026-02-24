<?php

use Illuminate\Support\Facades\Route;
use Modules\CRM\Http\Controllers\CRMController;
use Modules\CRM\Http\Controllers\EmailTrackingController;

Route::middleware(['auth', 'verified'])->prefix('admin/crm')->group(function () {
    Route::resource('crms', CRMController::class)->names('crm');
    
    // React SPA Route
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
