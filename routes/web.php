<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use App\Models\User;
use App\Models\SystemLog;
use App\Http\Controllers\TicketAttachmentController;
use App\Http\Controllers\SystemLogController;
use App\Filament\Pages\HelpArticleView;
use App\Http\Controllers\VideoCallController;
use Modules\CRM\Http\Controllers\EmailTrackingController;

Route::get('/', function () {
    if (Auth::check() || Auth::guard('employee')->check()) {
        return redirect('/admin');
    }
    return redirect('/newadmin/login');
});

Route::get('/manifest.webmanifest', function () {
    $brandingPath = base_path('branding.json');
    $branding = [
        'app_name' => config('app.name', 'GMCentral'),
        'app_favicon' => 'images/gmfavicon.png',
    ];

    if (is_file($brandingPath)) {
        $decoded = json_decode((string) file_get_contents($brandingPath), true);
        if (is_array($decoded)) {
            $branding = array_merge($branding, $decoded);
        }
    }

    $name = trim((string) ($branding['app_name'] ?? '')) ?: config('app.name', 'GMCentral');

    $raw = trim((string) ($branding['app_favicon'] ?? ''));
    if ($raw === '') {
        $icon = asset('images/gmfavicon.png');
    } elseif (str_starts_with($raw, 'http://') || str_starts_with($raw, 'https://') || str_starts_with($raw, 'data:')) {
        $icon = $raw;
    } else {
        $p = ltrim($raw, '/');
        if (str_starts_with($p, 'branding/')) {
            $icon = asset('storage/' . $p);
        } elseif (str_starts_with($p, 'storage/')) {
            $icon = asset($p);
        } else {
            $icon = asset($p);
        }
    }

    $manifest = [
        'name' => $name,
        'short_name' => $name,
        'start_url' => '/admin',
        'scope' => '/',
        'display' => 'standalone',
        'background_color' => '#0b0c0f',
        'theme_color' => '#0b0c0f',
        'icons' => [
            ['src' => $icon, 'sizes' => '192x192', 'type' => 'image/png'],
            ['src' => $icon, 'sizes' => '512x512', 'type' => 'image/png'],
        ],
    ];

    return response()->json($manifest)->header('Content-Type', 'application/manifest+json');
});

Route::get('/service-worker.js', function () {
    $js = "self.addEventListener('install', (event) => { self.skipWaiting(); });\n" .
          "self.addEventListener('activate', (event) => { event.waitUntil(self.clients.claim()); });\n" .
          "self.addEventListener('fetch', (event) => {\n" .
          "  const req = event.request;\n" .
          "  if (req.method !== 'GET') return;\n" .
          "  event.respondWith(fetch(req).catch(() => caches.match(req)));\n" .
          "});\n";

    return response($js, 200)->header('Content-Type', 'application/javascript');
});

// Rotas de anexos (view inline + download)
Route::get('/tickets/attachments/{attachment}/view', [TicketAttachmentController::class, 'view'])
    ->name('tickets.attachments.view');

Route::get('/tickets/attachments/{attachment}/download', [TicketAttachmentController::class, 'download'])
    ->name('tickets.attachments.download');

Route::get('/system-log/{systemLog}/download', [SystemLogController::class, 'downloadJson'])
    ->name('system-log.download')
    ->middleware('auth');

Route::get('/admin/help-articles/{slug}', [HelpArticleView::class, 'mount'])
    ->name('filament.admin.pages.help-article')
    ->middleware(['web', 'auth']);

Route::get('/video-call/{room}', function (string $room) {
    return redirect('/admin/video-call?room=' . urlencode($room));
})
    ->name('video-call.show')
    ->middleware(['web', 'auth']);

// CRM tracking routes fallback (ensure available regardless of module provider state)
Route::get('crm/track/pixel/{delivery}', [EmailTrackingController::class, 'pixel'])->name('crm.track.pixel');
Route::get('crm/track/click/{delivery}', [EmailTrackingController::class, 'click'])->name('crm.track.click');
Route::get('crm/track/unsubscribe/{delivery}', [EmailTrackingController::class, 'unsubscribe'])->name('crm.track.unsubscribe');

// Storage fallback (dev/Windows): servir arquivos públicos sem symlink
Route::get('/storage/{path}', function (string $path) {
    $safe = str_replace('..', '', $path);
    $full = storage_path('app/public/' . ltrim($safe, '/'));
    abort_unless(file_exists($full) && is_file($full), 404);
    return response()->file($full);
})->where('path', '.*');

Route::get('/posts/images/{filename}', function (string $filename) {
    $u = auth('web')->user() ?? auth('employee')->user();
    abort_unless($u, 401);

    $filename = trim($filename);
    abort_unless($filename !== '' && preg_match('/\A[a-z0-9][a-z0-9._-]*\z/i', $filename), 404);

    $disk = Storage::disk('public');
    $relative = 'posts/images/' . $filename;
    abort_unless($disk->exists($relative), 404);

    $path = $disk->path($relative);
    abort_unless(is_file($path), 404);

    return response()->file($path, [
        'Cache-Control' => 'private, max-age=0, must-revalidate',
    ]);
})->middleware(['web', 'auth:web,employee']);

Route::get('/posts/images/{filename}', function (string $filename) {
    $u = auth('web')->user() ?? auth('employee')->user();
    abort_unless($u, 401);

    $filename = trim($filename);
    abort_unless($filename !== '' && preg_match('/\A[a-z0-9][a-z0-9._-]*\z/i', $filename), 404);

    $disk = Storage::disk('public');
    $relative = 'posts/images/' . $filename;
    abort_unless($disk->exists($relative), 404);

    $path = $disk->path($relative);
    abort_unless(is_file($path), 404);

    return response()->file($path, [
        'Cache-Control' => 'private, max-age=0, must-revalidate',
    ]);
})->middleware(['web', 'auth:web,employee']);

// Compatibilidade de URLs do painel
Route::get('/newadmin/login', fn () => redirect('/filament-admin/login'))->name('newadmin.login');
Route::get('/newadmin', fn () => redirect('/admin'));
Route::get('/filament-admin', fn () => redirect('/admin'));

// Compatibilidade de URLs do painel
Route::get('/admin/login', fn () => redirect('/newadmin/login'));
Route::get('/newadmin', fn () => redirect('/admin'));
Route::get('/filament-admin', fn () => redirect('/admin'));

// Login do novo painel (newadmin)
Route::get('/newadmin/login', function () {
    if (Auth::check() || Auth::guard('employee')->check()) {
        return redirect('/admin');
    }
    return view('newadmin-login');
})->name('newadmin.login');

Route::post('/newadmin/login', function (Request $request) {
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);
    $remember = (bool) $request->input('remember', false);

    if (Auth::attempt($credentials, $remember)) {
        $request->session()->regenerate();

        $u = Auth::user();
        if ($u instanceof User) {
            try { $u->updateLastLogin(); } catch (\Throwable $e) {}
            try {
                SystemLog::create([
                    'user_id' => $u->id,
                    'action' => 'login',
                    'model_type' => User::class,
                    'model_id' => $u->id,
                    'description' => 'Login efetuado',
                    'ip_address' => (string) $request->ip(),
                    'user_agent' => (string) $request->userAgent(),
                    'level' => 'info',
                    'context' => [ 'path' => (string) $request->path(), 'remember' => $remember ],
                ]);
            } catch (\Throwable $e) {}
        }

        return redirect()->intended('/admin');
    }

    if (Auth::guard('employee')->attempt($credentials, $remember)) {
        $request->session()->regenerate();
        return redirect()->intended('/admin');
    }

    return back()->withErrors(['email' => 'Credenciais inválidas.'])->withInput();
});

Route::post('/newadmin/logout', function (Request $request) {
    $u = Auth::user();
    if ($u instanceof User) {
        try {
            SystemLog::create([
                'user_id' => $u->id,
                'action' => 'logout',
                'model_type' => User::class,
                'model_id' => $u->id,
                'description' => 'Logout efetuado',
                'ip_address' => (string) $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'level' => 'info',
                'context' => [
                    'path' => (string) $request->path(),
                ],
            ]);
        } catch (\Throwable $e) {
        }
    }

    Auth::logout();
    Auth::guard('employee')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect('/newadmin/login');
});

Route::post('/logout', function (Request $request) {
    $u = Auth::user();
    if ($u instanceof User) {
        try {
            SystemLog::create([
                'user_id' => $u->id,
                'action' => 'logout',
                'model_type' => User::class,
                'model_id' => $u->id,
                'description' => 'Logout efetuado',
                'ip_address' => (string) $request->ip(),
                'user_agent' => (string) $request->userAgent(),
                'level' => 'info',
                'context' => [
                    'path' => (string) $request->path(),
                    'source' => 'newfrontend',
                ],
            ]);
        } catch (\Throwable $e) {
        }
    }

    Auth::logout();
    Auth::guard('employee')->logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();

    return response()->json(['ok' => true]);
});

// CRM SPA (rota específica, antes do catch-all)
Route::get('/admin/crm/app/{any?}', function () {
    if (!Auth::check()) {
        return redirect('/newadmin/login');
    }
    return view('crm-frontend');
})->where('any', '.*');

// Catch-all do painel para o novo SPA (newfrontend)
Route::get('/admin/{any?}', function () {
    if (!Auth::check() && !Auth::guard('employee')->check()) {
        return redirect('/newadmin/login');
    }
    return view('newfrontend');
})->where('any', '.*');


