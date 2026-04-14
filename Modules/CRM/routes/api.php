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
use Modules\CRM\Http\Controllers\Api\MyFormulaCustomerController;
use Modules\CRM\Http\Controllers\Api\MyFormulaProductController;
use Modules\CRM\Http\Controllers\Api\MyFormulaQuizController;
use Modules\CRM\Http\Controllers\Api\EspacoAbsolutoController;
use Modules\CRM\Http\Controllers\CRMController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

Route::prefix('v1')->group(function () {
    Route::middleware(['auth:sanctum'])->apiResource('crms', CRMController::class)->names('crm');

    // User & Notifications
    Route::middleware(['web', 'auth:web,employee'])->group(function () {
        Route::get('user', [UserController::class, 'me']);
        Route::get('notifications', [UserController::class, 'notifications']);
        Route::post('notifications/read', [UserController::class, 'markAsRead']);
        Route::post('notifications/{id}/read', [UserController::class, 'markOneAsRead']);
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

    Route::prefix('bliss')->middleware(['web', 'auth:web,employee'])->group(function () {
        Route::get('dashboard', [BlissDashboardApiController::class, 'index']);
        Route::get('products', [BlissProductController::class, 'index']);
        Route::get('customers', [BlissCustomerController::class, 'index']);
        Route::post('customers/export-contacts', [BlissCustomerController::class, 'exportToContacts']);
        Route::get('orders', [BlissOrderController::class, 'index']);
        Route::get('order-statuses', [BlissOrderStatusController::class, 'index']);
    });

    Route::prefix('myformula')->middleware(['web', 'auth:web,employee'])->group(function () {
        $requireMyFormulaCompany = function () {
            $u = auth('web')->user() ?? auth('employee')->user();
            if (! $u) {
                abort(401);
            }

            if ($u instanceof \App\Models\EmployeeUser) {
                abort_unless(strtolower((string) ($u->employee?->company?->slug ?? '')) === 'myformula', 403);
                return;
            }

            if (! ($u instanceof \App\Models\User)) {
                abort(401);
            }

            if ($u->isAdmin()) {
                return;
            }

            $role = strtolower(trim((string) ($u->role ?? '')));
            $isEmployee = in_array($role, ['employee', 'funcionario', 'funcionário', 'colaborador'], true);
            abort_unless($isEmployee, 403);

            $companyOk = false;
            try {
                if ($u->company && strtolower((string) ($u->company->slug ?? '')) === 'myformula') {
                    $companyOk = true;
                }
            } catch (\Throwable) {
                $companyOk = false;
            }

            if (! $companyOk) {
                try {
                    $companyOk = $u->companies()->where('slug', 'myformula')->exists();
                } catch (\Throwable) {
                    $companyOk = false;
                }
            }

            abort_unless($companyOk, 403);
        };

        Route::get('meta/countries', function () use ($requireMyFormulaCompany) {
            $requireMyFormulaCompany();

            try {
                $rows = DB::connection('myformula')
                    ->table('country')
                    ->select(['country_id', 'name'])
                    ->orderBy('name')
                    ->get();

                $data = $rows->map(fn ($r) => [
                    'country_id' => (int) ($r->country_id ?? 0),
                    'name' => (string) ($r->name ?? ''),
                ])->filter(fn ($r) => $r['country_id'] > 0 && $r['name'] !== '')->values();

                return response()->json(['data' => $data]);
            } catch (\Throwable $e) {
                Log::error('myformula.meta.countries_failed', ['error' => $e->getMessage()]);
                return response()->json(['data' => []]);
            }
        });

        Route::get('meta/zones', function () use ($requireMyFormulaCompany) {
            $requireMyFormulaCompany();

            $countryId = (int) request('country_id', 0);
            $country = trim((string) request('country', ''));

            if ($countryId <= 0 && $country !== '') {
                try {
                    $countryId = (int) (DB::connection('myformula')
                        ->table('country')
                        ->whereRaw('LOWER(name) = ?', [strtolower($country)])
                        ->value('country_id') ?? 0);

                    if ($countryId <= 0) {
                        $countryId = (int) (DB::connection('myformula')
                            ->table('country')
                            ->where('name', 'like', '%' . $country . '%')
                            ->orderBy('country_id')
                            ->value('country_id') ?? 0);
                    }
                } catch (\Throwable) {
                    $countryId = 0;
                }
            }

            if ($countryId <= 0) {
                return response()->json(['data' => []]);
            }

            try {
                $rows = DB::connection('myformula')
                    ->table('zone')
                    ->select(['zone_id', 'name'])
                    ->where('country_id', $countryId)
                    ->orderBy('name')
                    ->get();

                $data = $rows->map(fn ($r) => [
                    'zone_id' => (int) ($r->zone_id ?? 0),
                    'name' => (string) ($r->name ?? ''),
                ])->filter(fn ($r) => $r['zone_id'] > 0 && $r['name'] !== '')->values();

                return response()->json(['data' => $data]);
            } catch (\Throwable $e) {
                Log::error('myformula.meta.zones_failed', ['error' => $e->getMessage()]);
                return response()->json(['data' => []]);
            }
        });

        Route::get('dashboard', [MyFormulaDashboardApiController::class, 'index']);
        Route::get('customers', [MyFormulaCustomerController::class, 'index']);
        Route::post('customers', [MyFormulaCustomerController::class, 'store']);
        Route::post('customers/export-contacts', [MyFormulaCustomerController::class, 'exportToContacts']);

        Route::get('products', [MyFormulaProductController::class, 'index']);
        Route::post('products', [MyFormulaProductController::class, 'store']);
        Route::put('products/{id}', [MyFormulaProductController::class, 'update']);
        Route::delete('products/{id}', [MyFormulaProductController::class, 'destroy']);

        Route::get('orders', [MyFormulaOrderController::class, 'index']);
        Route::post('orders', [MyFormulaOrderController::class, 'store']);
        Route::get('orders/{id}', [MyFormulaOrderController::class, 'show']);
        Route::get('orders/{id}/purchase-report', [MyFormulaOrderController::class, 'purchaseReport']);
        Route::get('order-statuses', [MyFormulaOrderStatusController::class, 'index']);

        Route::get('quizzes', [MyFormulaQuizController::class, 'index']);
        Route::get('quizzes/latest', [MyFormulaQuizController::class, 'latestByCustomer']);
        Route::post('quizzes', [MyFormulaQuizController::class, 'store']);
        Route::get('quizzes/stats', [MyFormulaQuizController::class, 'stats']);
    });

    Route::prefix('espacoabsoluto')->middleware(['web', 'auth:web,employee'])->group(function () {
        Route::get('overview', [EspacoAbsolutoController::class, 'overview']);
        Route::get('customers', [EspacoAbsolutoController::class, 'customers']);
        Route::get('user-groups', [EspacoAbsolutoController::class, 'userGroups']);
        Route::get('user-messages', [EspacoAbsolutoController::class, 'userMessages']);
        Route::get('appointments', [EspacoAbsolutoController::class, 'appointments']);
    });
});
