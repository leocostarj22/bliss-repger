<?php

use Illuminate\Support\Facades\Route;
use Modules\CRM\Http\Controllers\Api\CampaignController;
use Modules\CRM\Http\Controllers\Api\ContactController;
use Modules\CRM\Http\Controllers\Api\DashboardController;
use Modules\CRM\Http\Controllers\Api\SegmentController;
use Modules\CRM\Http\Controllers\Api\UserController;
use Modules\CRM\Http\Controllers\Api\AutomationController;
use Modules\CRM\Http\Controllers\CRMController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

Route::prefix('v1')->group(function () {
    Route::middleware(['auth:sanctum'])->apiResource('crms', CRMController::class)->names('crm');

    // User & Notifications
    Route::middleware(['web', 'auth'])->group(function () {
        Route::get('user', [UserController::class, 'me']);
        Route::get('notifications', [UserController::class, 'notifications']);
        Route::post('notifications/read', [UserController::class, 'markAsRead']);
        Route::delete('notifications', [UserController::class, 'clear']);
    });

    // Email Marketing / Dashboard Routes
    // Note: Temporarily removed auth:sanctum for development ease. Re-enable for production.
    Route::prefix('email')->group(function () {
        // Route to serve images directly (bypassing storage link issues)
        Route::get('media/view/{filename}', function ($filename) {
            $path = storage_path('app/public/crm-media/' . $filename);
            
            if (!file_exists($path)) {
                abort(404);
            }

            return response()->file($path);
        })->name('crm.media.view');

        Route::post('media/upload', function (Request $request) {
            try {
                $request->validate([
                    'file' => 'required|image|max:5120', // 5MB max
                ]);

                if ($request->hasFile('file')) {
                    $file = $request->file('file');
                    $filename = Str::uuid() . '.' . $file->getClientOriginalExtension();
                    
                    // Store in public disk under crm-media folder
                    $file->storeAs('crm-media', $filename, 'public');
                    
                    // Generate URL using the dedicated view route
                    // Manually construct URL to avoid route cache issues
                    $url = url('api/v1/email/media/view/' . $filename);

                    return response()->json([
                        'url' => $url,
                    ]);
                }

                return response()->json(['error' => 'No file uploaded'], 400);
            } catch (\Exception $e) {
                Log::error('Image upload failed: ' . $e->getMessage());
                return response()->json(['error' => 'Upload failed: ' . $e->getMessage()], 500);
            }
        });
        Route::get('analytics', [DashboardController::class, 'index']);
        Route::get('campaigns', [CampaignController::class, 'index']);
        Route::post('campaigns', [CampaignController::class, 'store']);
        Route::get('campaigns/{id}', [CampaignController::class, 'show']);
        Route::put('campaigns/{id}', [CampaignController::class, 'update']);
        Route::delete('campaigns/{id}', [CampaignController::class, 'destroy']);
        Route::post('campaigns/{id}/duplicate', [CampaignController::class, 'duplicate']);
        Route::get('campaigns/{id}/logs', [CampaignController::class, 'logs']);
        
        // Segments Routes
        Route::get('segments', [SegmentController::class, 'index']);
        Route::post('segments', [SegmentController::class, 'store']);

        // Contacts Routes
        Route::get('lists', [ContactController::class, 'index']);
        Route::post('lists', [ContactController::class, 'store']);
        Route::get('lists/{id}', [ContactController::class, 'show']);
        Route::put('lists/{id}', [ContactController::class, 'update']);
        Route::delete('lists/{id}', [ContactController::class, 'destroy']);
        Route::post('lists/{id}/tags', [ContactController::class, 'addTag']);
        Route::delete('lists/{id}/tags', [ContactController::class, 'removeTag']);

        // Automation Routes
        Route::get('automations', [AutomationController::class, 'index']);
        Route::post('automations', [AutomationController::class, 'store']);
        Route::get('automations/{id}', [AutomationController::class, 'show']);
        Route::put('automations/{id}', [AutomationController::class, 'update']);
        Route::delete('automations/{id}', [AutomationController::class, 'destroy']);
        Route::post('automations/{id}/duplicate', [AutomationController::class, 'duplicate']);
    });
});
