<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\TicketAttachmentController;
use App\Http\Controllers\SystemLogController;

Route::get('/', function () {
    return view('welcome');
});

// Rota para download de anexos
Route::get('/tickets/attachments/{attachment}/download', [TicketAttachmentController::class, 'download'])
    ->name('tickets.attachments.download')
    ->middleware('auth'); // Adicionar middleware de autenticação se necessário

Route::get('/system-log/{systemLog}/download', [SystemLogController::class, 'downloadJson'])
    ->name('system-log.download')
    ->middleware('auth');
