<?php

namespace App\Http\Controllers;

use App\Models\TicketAttachment;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TicketAttachmentController extends Controller
{
    private function authorizeAttachment(TicketAttachment $attachment): void
    {
        if (Auth::check()) {
            return;
        }

        $employee = Auth::guard('employee')->user();
        if (!$employee) {
            abort(401);
        }

        $ticket = $attachment->ticket;
        abort_unless($ticket, 404);
        abort_unless($ticket->user_type === \App\Models\EmployeeUser::class, 403);
        abort_unless((string) $ticket->user_id === (string) $employee->id, 403);
    }

    public function view(TicketAttachment $attachment): StreamedResponse
    {
        $this->authorizeAttachment($attachment);

        if (!$attachment->exists()) {
            abort(404, 'Arquivo não encontrado.');
        }

        $disk = is_string($attachment->disk) && $attachment->disk !== '' ? $attachment->disk : 'public';
        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        return $storage->response(
            $attachment->file_path,
            $attachment->original_name,
            [
                'Content-Disposition' => 'inline; filename="' . addslashes($attachment->original_name) . '"',
            ]
        );
    }

    public function download(TicketAttachment $attachment): StreamedResponse
    {
        $this->authorizeAttachment($attachment);

        if (!$attachment->exists()) {
            abort(404, 'Arquivo não encontrado.');
        }

        $disk = is_string($attachment->disk) && $attachment->disk !== '' ? $attachment->disk : 'public';
        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk($disk);

        return $storage->download(
            $attachment->file_path,
            $attachment->original_name
        );
    }
}