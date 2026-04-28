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
        Route::post('templates/{id}/duplicate', [TemplateController::class, 'duplicate']);

        // ── Banco de Imagens / Vídeos (Pexels) ────────────────────
        Route::get('stock', function (Request $request) {
            $apiKey = env('PEXELS_API_KEY', '');
            if (! $apiKey) {
                return response()->json(['error' => 'PEXELS_API_KEY não configurada no servidor.'], 503);
            }

            $type        = $request->input('type', 'images'); // images | videos
            $query       = trim((string) $request->input('q', 'business'));
            $page        = max(1, (int) $request->input('page', 1));
            $perPage     = min(30, max(6, (int) $request->input('per_page', 18)));
            $orientation = $request->input('orientation', 'all');
            $sslVerify   = filter_var(env('GROQ_SSL_VERIFY', 'true'), FILTER_VALIDATE_BOOLEAN);

            if ($query === '') {
                $query = 'business';
            }

            $validOrientations = ['landscape', 'portrait', 'square'];
            $orientationParam  = in_array($orientation, $validOrientations) ? "&orientation={$orientation}" : '';

            $endpoint = $type === 'videos'
                ? "https://api.pexels.com/videos/search?query={$query}&per_page={$perPage}&page={$page}"
                : "https://api.pexels.com/v1/search?query={$query}&per_page={$perPage}&page={$page}{$orientationParam}";

            try {
                $pexels = \Illuminate\Support\Facades\Http::withHeaders(['Authorization' => $apiKey])
                    ->withOptions(['verify' => $sslVerify])
                    ->timeout(15)
                    ->get($endpoint);

                if (! $pexels->successful()) {
                    Log::error('Pexels API error', ['status' => $pexels->status()]);
                    return response()->json(['error' => 'Erro ao contactar o Pexels.'], 502);
                }

                $raw = $pexels->json();

                if ($type === 'videos') {
                    $items = collect($raw['videos'] ?? [])->map(function ($v) {
                        $mp4 = collect($v['video_files'] ?? [])
                            ->where('file_type', 'video/mp4')
                            ->sortByDesc('width')
                            ->first();
                        return [
                            'id'           => $v['id'],
                            'thumbnail'    => $v['image'] ?? '',
                            'duration'     => $v['duration'] ?? 0,
                            'author'       => $v['user']['name'] ?? '',
                            'author_url'   => $v['user']['url'] ?? '',
                            'video_url'    => $mp4['link'] ?? '',
                            'pexels_url'   => $v['url'] ?? '',
                        ];
                    })->values();
                } else {
                    $items = collect($raw['photos'] ?? [])->map(function ($p) {
                        return [
                            'id'          => $p['id'],
                            'alt'         => $p['alt'] ?? '',
                            'thumb'       => $p['src']['small'] ?? '',
                            'medium'      => $p['src']['large2x'] ?? $p['src']['large'] ?? '',
                            'original'    => $p['src']['original'] ?? '',
                            'author'      => $p['photographer'] ?? '',
                            'author_url'  => $p['photographer_url'] ?? '',
                            'pexels_url'  => $p['url'] ?? '',
                        ];
                    })->values();
                }

                return response()->json([
                    'data' => $items,
                    'meta' => [
                        'total'    => $raw['total_results'] ?? 0,
                        'page'     => $raw['page'] ?? $page,
                        'per_page' => $raw['per_page'] ?? $perPage,
                    ],
                ]);

            } catch (\Throwable $e) {
                Log::error('Pexels stock failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Falha ao carregar banco de mídia.'], 500);
            }
        });

        // ── IA / Groq ──────────────────────────────────────────────
        Route::post('ai/generate', function (Request $request) {
            $apiKey = env('GROQ_API_KEY', '');
            if (! $apiKey) {
                return response()->json(['error' => 'GROQ_API_KEY não configurada no servidor.'], 503);
            }

            $action         = $request->input('action', 'generate_text');
            $prompt         = trim((string) $request->input('prompt', ''));
            $currentContent = trim((string) $request->input('current_content', ''));
            $tone           = $request->input('tone', 'formal');
            $model          = env('GROQ_MODEL', 'llama-3.3-70b-versatile');

            if (! $prompt && ! $currentContent) {
                return response()->json(['error' => 'Forneça um prompt ou conteúdo.'], 422);
            }

            $toneMap = [
                'formal'     => 'tom formal e profissional',
                'informal'   => 'tom informal e descontraído',
                'persuasivo' => 'tom persuasivo e convincente',
                'direto'     => 'tom direto e objetivo',
                'amigavel'   => 'tom amigável e caloroso',
            ];
            $toneDesc = $toneMap[$tone] ?? 'tom profissional';

            switch ($action) {
                case 'improve_text':
                    $system = "Você é um especialista em copywriting para email marketing em português. Melhore o texto fornecido mantendo a ideia principal, mas com melhor fluidez, clareza e impacto. Use {$toneDesc}. Retorne APENAS o HTML melhorado (use <p>, <strong>, <em>, <br> se necessário), sem explicações.";
                    $user   = $currentContent ?: $prompt;
                    break;

                case 'rewrite':
                    $system = "Você é um especialista em copywriting para email marketing em português. Reescreva completamente o seguinte texto com {$toneDesc}, mantendo a mensagem principal mas com palavras e estrutura totalmente diferentes. Retorne APENAS o HTML reescrito, sem explicações.";
                    $user   = $currentContent ?: $prompt;
                    break;

                case 'summarize':
                    $system = "Você é um especialista em copywriting para email marketing em português. Resuma o texto a seguir de forma concisa, mantendo os pontos principais. Use {$toneDesc}. Retorne APENAS o HTML do resumo, sem explicações.";
                    $user   = $currentContent ?: $prompt;
                    break;

                case 'generate_cta':
                    $system = "Você é um especialista em email marketing em português. Gere 5 textos de call-to-action (CTA) para um botão de email com {$toneDesc}. Os textos devem ser curtos (2-5 palavras), diretos e motivadores. Retorne APENAS um array JSON de strings, ex: [\"Saiba mais\",\"Ver oferta\"]. Nenhum outro texto.";
                    $user   = $prompt ?: 'Botão de call-to-action para email marketing';
                    break;

                case 'generate_template':
                    $system = 'Você é um especialista em email marketing em português. Gere uma estrutura JSON de template de email completo baseado na descrição fornecida.'
                        . "\n\nRetorne APENAS um array JSON válido de blocos, SEM explicações, SEM markdown, SEM blocos de código. Apenas o JSON puro."
                        . "\n\nEstruturas permitidas:"
                        . "\n{\"type\":\"text\",\"props\":{\"content\":\"<p>texto</p>\",\"fontSize\":16,\"lineHeight\":1.6,\"color\":\"#333333\",\"align\":\"left\",\"bgColor\":\"#ffffff\"}}"
                        . "\n{\"type\":\"image\",\"props\":{\"src\":\"https://placehold.co/600x200/1a8a8a/ffffff?text=Imagem\",\"alt\":\"Imagem\",\"width\":\"100%\",\"hyperlink\":\"\"}}"
                        . "\n{\"type\":\"button\",\"props\":{\"text\":\"Clique aqui\",\"url\":\"#\",\"bgColor\":\"#1a8a8a\",\"textColor\":\"#ffffff\",\"align\":\"center\",\"borderRadius\":6}}"
                        . "\n{\"type\":\"divider\",\"props\":{\"height\":1,\"color\":\"#e0e0e0\",\"margin\":16}}"
                        . "\n{\"type\":\"spacer\",\"props\":{\"height\":16}}"
                        . "\n\nUse conteúdo realista em português baseado na descrição. Gere entre 5 e 10 blocos.";
                    $user = $prompt;
                    break;

                default: // generate_text
                    $system = "Você é um especialista em copywriting para email marketing em português. Escreva um texto de email com {$toneDesc} baseado na descrição a seguir. Retorne APENAS o HTML do corpo do email (use <p>, <strong>, <em>, <br>), sem assunto, sem explicações.";
                    $user   = $prompt;
                    break;
            }

            try {
                $maxTokens = $action === 'generate_template' ? 2000 : 800;
                $sslVerify  = filter_var(env('GROQ_SSL_VERIFY', 'true'), FILTER_VALIDATE_BOOLEAN);
                $groqResponse = \Illuminate\Support\Facades\Http::withToken($apiKey)
                    ->withOptions(['verify' => $sslVerify])
                    ->timeout(45)
                    ->post('https://api.groq.com/openai/v1/chat/completions', [
                        'model'    => $model,
                        'messages' => [
                            ['role' => 'system', 'content' => $system],
                            ['role' => 'user',   'content' => $user],
                        ],
                        'temperature' => 0.7,
                        'max_tokens'  => $maxTokens,
                    ]);

                if (! $groqResponse->successful()) {
                    Log::error('Groq API error', ['status' => $groqResponse->status(), 'body' => $groqResponse->body()]);
                    return response()->json(['error' => 'Erro ao contactar a IA. Verifique a chave configurada.'], 502);
                }

                $content = trim((string) ($groqResponse->json('choices.0.message.content') ?? ''));

                if (! $content) {
                    return response()->json(['error' => 'A IA não retornou conteúdo.'], 502);
                }

                return response()->json(['data' => ['content' => $content]]);

            } catch (\Throwable $e) {
                Log::error('Groq AI generate failed', ['error' => $e->getMessage()]);
                return response()->json(['error' => 'Falha na geração: ' . $e->getMessage()], 500);
            }
        });
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

        Route::get('plans/recommended', function () use ($requireMyFormulaCompany) {
            $requireMyFormulaCompany();

            $quizId = (int) request('quiz_id', 0);
            if ($quizId <= 0) {
                return response()->json(['data' => []]);
            }

            try {
                $quiz = DB::connection('myformula')->table('quiz')->where('quiz_id', $quizId)->first();
                if (! $quiz) {
                    return response()->json(['data' => []]);
                }

                $post = json_decode((string) ($quiz->post ?? ''), true);
                if (! is_array($post)) {
                    $post = [];
                }

                $gender = strtolower(trim((string) ($post['gender'] ?? '')));

                $improve = (string) ($post['improve_health'] ?? '');
                $codes = collect(explode(',', $improve))
                    ->map(fn ($x) => strtoupper(trim((string) $x)))
                    ->filter(fn ($x) => $x !== '' && preg_match('/^[A-K]$/', $x))
                    ->values();

                if ($gender !== 'female') {
                    $codes = $codes->reject(fn ($x) => $x === 'K')->values();
                }

                $primary = (string) ($codes->first() ?? '');

                $map = [
                    'A' => ['Plan-16', 'Plan-17', 'Plan-18'],
                    'B' => ['Plan-19', 'Plan-20', 'Plan-21'],
                    'C' => ['Plan-22', 'Plan-23', 'Plan-24'],
                    'K' => ['Plan-01', 'Plan-02', 'Plan-03'],
                    'E' => ['Plan-10', 'Plan-11', 'Plan-12'],
                    'F' => ['Plan-28', 'Plan-29', 'Plan-30'],
                    'G' => ['Plan-04', 'Plan-05', 'Plan-06'],
                    'H' => ['Plan-25', 'Plan-26', 'Plan-27'],
                    'I' => ['Plan-13', 'Plan-14', 'Plan-15'],
                    'J' => ['Plan-07', 'Plan-08', 'Plan-09'],
                ];

                $models = [];
                $usedObjectives = [];

                foreach ($codes as $code) {
                    if (! isset($map[$code])) {
                        continue;
                    }

                    foreach ($map[$code] as $m) {
                        $models[] = $m;
                    }

                    $usedObjectives[] = $code;
                    if (count($usedObjectives) >= 3) {
                        break;
                    }
                }

                if (! $models) {
                    return response()->json([
                        'data' => [],
                        'meta' => [
                            'primary_preference' => $primary,
                            'used_objectives' => $usedObjectives,
                            'models' => [],
                        ],
                    ]);
                }

                $picked = [];

                foreach ($models as $modelKey) {
                    if (isset($picked[$modelKey])) {
                        continue;
                    }

                    $row = DB::connection('myformula')
                        ->table('product as p')
                        ->leftJoin('product_description as pd', function ($join) {
                            $join->on('pd.product_id', '=', 'p.product_id')->where('pd.language_id', 2);
                        })
                        ->select([
                            'p.product_id',
                            'p.model',
                            'p.price',
                            'p.quantity',
                            'p.status',
                            'p.date_added',
                            'pd.name as name',
                            'pd.description as description',
                        ])
                        ->where('p.status', 1)
                        ->where('p.is_plan', 1)
                        ->where(function ($q) use ($modelKey) {
                            $q->where('p.model', 'like', '%' . $modelKey . '%')
                              ->orWhere('pd.name', 'like', '%' . $modelKey . '%');
                        })
                        ->orderBy('p.product_id')
                        ->first();

                    if ($row) {
                        $picked[$modelKey] = $row;
                    }

                    if (count($picked) >= 3) {
                        break;
                    }
                }

                $data = collect($models)
                    ->map(fn ($m) => $picked[$m] ?? null)
                    ->filter()
                    ->take(3)
                    ->map(function ($r) {
                        $rawDate = $r->date_added ?? null;
                        $date = null;
                        if ($rawDate instanceof \DateTimeInterface) {
                            $date = $rawDate->format(DATE_ATOM);
                        } elseif (is_string($rawDate) && $rawDate !== '') {
                            try {
                                $date = \Carbon\Carbon::parse($rawDate)->toIso8601String();
                            } catch (\Throwable) {
                                $date = null;
                            }
                        }

                        return [
                            'product_id' => (string) ($r->product_id ?? ''),
                            'model' => (string) ($r->model ?? ''),
                            'price' => $r->price !== null ? (float) $r->price : null,
                            'quantity' => $r->quantity !== null ? (int) $r->quantity : null,
                            'status' => isset($r->status) ? (bool) $r->status : null,
                            'date_added' => $date,
                            'description' => [
                                'product_id' => (string) ($r->product_id ?? ''),
                                'language_id' => 2,
                                'name' => (string) ($r->name ?? ''),
                                'description' => $r->description !== null ? (string) $r->description : null,
                            ],
                        ];
                    })
                    ->values();

                return response()->json([
                    'data' => $data,
                    'meta' => [
                        'gender' => $gender,
                        'primary_preference' => $primary,
                        'used_objectives' => $usedObjectives,
                        'models' => $models,
                        'returned' => $data->count(),
                    ],
                ]);
            } catch (\Throwable $e) {
                Log::error('myformula.plans.recommended_failed', ['error' => $e->getMessage()]);
                return response()->json(['data' => []]);
            }
        });

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
