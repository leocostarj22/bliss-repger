<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Notification;
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

// CRM tracking routes fallback (ensure available regardless of module provider state)
Route::get('crm/track/pixel/{delivery}', [EmailTrackingController::class, 'pixel'])->name('crm.track.pixel');
Route::get('crm/track/click/{delivery}', [EmailTrackingController::class, 'click'])->name('crm.track.click');
Route::get('crm/track/unsubscribe/{delivery}', [EmailTrackingController::class, 'unsubscribe'])->name('crm.track.unsubscribe');


