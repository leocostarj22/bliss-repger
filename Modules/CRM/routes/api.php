<?php

use Illuminate\Support\Facades\Route;
use Modules\CRM\Http\Controllers\Api\CampaignController;
use Modules\CRM\Http\Controllers\Api\ContactController;
use Modules\CRM\Http\Controllers\Api\DashboardController;
use Modules\CRM\Http\Controllers\Api\SegmentController;
use Modules\CRM\Http\Controllers\Api\UserController;
use Modules\CRM\Http\Controllers\Api\AutomationController;
use Modules\CRM\Http\Controllers\Api\TemplateController;
use Modules\CRM\Http\Controllers\Api\BlissProductController;
use Modules\CRM\Http\Controllers\Api\BlissCustomerController;
use Modules\CRM\Http\Controllers\Api\BlissOrderController;
use Modules\CRM\Http\Controllers\Api\BlissOrderStatusController;
use Modules\CRM\Http\Controllers\Api\BlissDashboardApiController;
use Modules\CRM\Http\Controllers\Api\MyFormulaDashboardApiController;
use Modules\CRM\Http\Controllers\Api\MyFormulaOrderController;
use Modules\CRM\Http\Controllers\Api\MyFormulaOrderStatusController;
use Modules\CRM\Http\Controllers\CRMController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;

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

        Route::get('media/list', function () {
            try {
                $disk = Storage::disk('public');
                $files = $disk->files('crm-media');

                $items = collect($files)
                    ->filter(fn ($path) => preg_match('/\.(png|jpe?g|gif|webp|svg)$/i', $path))
                    ->map(function ($path) use ($disk) {
                        $filename = basename($path);

                        return [
                            'filename' => $filename,
                            'url' => url('api/v1/email/media/view/' . $filename),
                            'size' => $disk->size($path),
                            'last_modified' => $disk->lastModified($path),
                        ];
                    })
                    ->sortByDesc('last_modified')
                    ->values();

                return response()->json(['data' => $items]);
            } catch (\Throwable $e) {
                Log::error('Media list failed: ' . $e->getMessage());
                return response()->json(['error' => 'Media list failed'], 500);
            }
        });

        Route::delete('media/{filename}', function ($filename) {
            try {
                $safe = basename($filename);
                $disk = Storage::disk('public');
                $path = 'crm-media/' . $safe;
                if (! $disk->exists($path)) {
                    return response()->json(['error' => 'Not found'], 404);
                }
                $disk->delete($path);
                return response()->json(['deleted' => true]);
            } catch (\Throwable $e) {
                Log::error('Media delete failed: ' . $e->getMessage());
                return response()->json(['error' => 'Media delete failed'], 500);
            }
        });

        Route::post('media/upload', function (Request $request) {
            try {
                $validator = Validator::make($request->all(), [
                    'file' => 'required|file|mimetypes:image/png,image/jpeg,image/gif,image/webp|max:15360',
                ]);
                if ($validator->fails()) {
                    return response()->json(['errors' => $validator->errors()], 422);
                }

                $file = $request->file('file');
                $overwrite = filter_var($request->query('overwrite'), FILTER_VALIDATE_BOOLEAN);

                $original = $file->getClientOriginalName();
                $name = pathinfo($original, PATHINFO_FILENAME);
                $ext = strtolower($file->getClientOriginalExtension());
                $safe = Str::slug($name);
                $disk = Storage::disk('public');
                if (! $disk->exists('crm-media')) {
                    $disk->makeDirectory('crm-media');
                }
                $filename = $safe . '.' . $ext;

                if ($overwrite) {
                    if ($disk->exists('crm-media/' . $filename)) {
                        $disk->delete('crm-media/' . $filename);
                    }
                } else {
                    $i = 1;
                    while ($disk->exists('crm-media/' . $filename)) {
                        $filename = $safe . '-' . $i++ . '.' . $ext;
                    }
                }
                
                $file->storeAs('crm-media', $filename, 'public');
                
                $url = url('api/v1/email/media/view/' . $filename);

                return response()->json([
                    'url' => $url,
                    'filename' => $filename,
                ]);
            } catch (\Illuminate\Http\Exceptions\PostTooLargeException $e) {
                Log::error('Image upload too large: ' . $e->getMessage());
                return response()->json(['error' => 'File too large'], 413);
            } catch (\Throwable $e) {
                Log::error('Image upload failed: ' . $e->getMessage());
                return response()->json(['error' => 'Upload failed'], 500);
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
        Route::post('campaigns/{id}/send-now', [CampaignController::class, 'sendNow']);
        
        // Segments Routes
        Route::get('segments', [SegmentController::class, 'index']);
        Route::get('segments/{id}/estimate', [SegmentController::class, 'estimate']);
        Route::post('segments/estimate-filters', [SegmentController::class, 'estimateByFilters']);
        Route::get('segments/{id}', [SegmentController::class, 'show']);
        Route::put('segments/{id}', [SegmentController::class, 'update']);
        Route::delete('segments/{id}', [SegmentController::class, 'destroy']);
        Route::post('segments', [SegmentController::class, 'store']);

        // Contacts Routes
        Route::post('lists/import', [ContactController::class, 'import']);
        Route::delete('lists/bulk', [ContactController::class, 'bulkDestroy']);
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

        // Templates Routes
        Route::get('templates', [TemplateController::class, 'index']);
        Route::post('templates', [TemplateController::class, 'store']);
        Route::get('templates/{id}', [TemplateController::class, 'show']);
        Route::put('templates/{id}', [TemplateController::class, 'update']);
        Route::delete('templates/{id}', [TemplateController::class, 'destroy']);
    });

    Route::prefix('bliss')->middleware(['web', 'auth'])->group(function () {
        Route::get('dashboard', [BlissDashboardApiController::class, 'index']);
        Route::get('products', [BlissProductController::class, 'index']);
        Route::get('customers', [BlissCustomerController::class, 'index']);
        Route::post('customers/export-contacts', [BlissCustomerController::class, 'exportToContacts']);
        Route::get('orders', [BlissOrderController::class, 'index']);
        Route::get('order-statuses', [BlissOrderStatusController::class, 'index']);
    });

    Route::prefix('myformula')->middleware(['web', 'auth'])->group(function () {
        Route::get('dashboard', [MyFormulaDashboardApiController::class, 'index']);
        Route::get('orders', [MyFormulaOrderController::class, 'index']);
        Route::get('orders/{id}', [MyFormulaOrderController::class, 'show']);
        Route::get('orders/{id}/purchase-report', [MyFormulaOrderController::class, 'purchaseReport']);
        Route::get('order-statuses', [MyFormulaOrderStatusController::class, 'index']);
    });
});
