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
    
    $deliveries = \Modules\CRM\Models\Delivery::where('campaign_id', $id)->get();
    $stats = [
        'total' => $deliveries->count(),
        'status_counts' => $deliveries->groupBy('status')->map->count(),
        'sent_at_filled' => $deliveries->whereNotNull('sent_at')->count(),
        'opened_at_filled' => $deliveries->whereNotNull('opened_at')->count(),
        'clicked_at_filled' => $deliveries->whereNotNull('clicked_at')->count(),
    ];
    
    $lastFailedJob = \Illuminate\Support\Facades\DB::table('failed_jobs')->orderBy('failed_at', 'desc')->first();
    
    return [
        'campaign' => $campaign->toArray(),
        'stats' => $stats,
        'last_failed_job_exception' => $lastFailedJob ? substr($lastFailedJob->exception, 0, 1000) : 'No failed jobs',
        'server_time' => now()->toDateTimeString(),
    ];
});
