<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TicketAttachmentController;
use App\Http\Controllers\SystemLogController;
use App\Http\Controllers\VideoCallController;
use App\Filament\Pages\HelpArticleView;
use Illuminate\Support\Str;
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

Route::get('/video-call/{room?}', function ($room = null) {
    $roomId = $room ?? 'sala-' . Str::random(8); // gera ID único se não passar nenhum
    return view('video-call', compact('roomId'));
})->name('video-call');


