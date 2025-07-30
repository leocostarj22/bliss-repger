<?php

namespace App\Http\Controllers;

use App\Models\TicketAttachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketAttachmentController extends Controller
{
    public function download(TicketAttachment $attachment): StreamedResponse
    {
        // Verificar se o arquivo existe
        if (!$attachment->exists()) {
            abort(404, 'Arquivo não encontrado.');
        }
        
        // Verificar permissões (opcional - adicionar lógica de autorização)
        // $this->authorize('download', $attachment);
        
        return Storage::disk($attachment->disk)->download(
            $attachment->file_path,
            $attachment->original_name
        );
    }
}