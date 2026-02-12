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
