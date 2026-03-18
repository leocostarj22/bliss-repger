<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Auth;
use App\Models\User;
use App\Http\Controllers\TicketAttachmentController;
use App\Http\Controllers\SystemLogController;
use App\Filament\Pages\HelpArticleView;
use App\Http\Controllers\VideoCallController;
use Modules\CRM\Http\Controllers\EmailTrackingController;

Route::get('/', function () {
    return view('welcome');
});

// Rota para download de anexos
Route::get('/tickets/attachments/{attachment}/download', [TicketAttachmentController::class, 'download'])
    ->name('tickets.attachments.download')
    ->middleware('auth');

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
    if (Auth::check()) {
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
        return redirect()->intended('/admin');
    }

    return back()->withErrors(['email' => 'Credenciais inválidas.'])->withInput();
});

Route::post('/newadmin/logout', function (Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect('/newadmin/login');
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
    if (!Auth::check()) {
        return redirect('/newadmin/login');
    }
    return view('newfrontend');
})->where('any', '.*');


