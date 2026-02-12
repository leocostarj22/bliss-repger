<?php

namespace Modules\CRM\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Filament\Facades\Filament;

class UserController extends Controller
{
    public function me(Request $request)
    {
        $user = $request->user();
        
        $avatar = Filament::getUserAvatarUrl($user);

        return response()->json([
            'data' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $avatar,
            ]
        ]);
    }

    public function notifications(Request $request)
    {
        // Check if user trait exists or manually query table if needed
        // Assuming standard Laravel Notifications
        $notifications = $request->user()
            ->notifications()
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($n) {
                // Filament notifications structure usually has 'title', 'body', etc in 'data'
                $data = $n->data;
                $title = $data['title'] ?? ($data['subject'] ?? 'Notification');
                $message = $data['body'] ?? ($data['message'] ?? '');
                
                // Handle Filament specific structure
                if (isset($data['format']) && $data['format'] === 'filament') {
                   $title = $data['title'] ?? $title;
                   $message = $data['body'] ?? $message;
                }

                return [
                    'id' => $n->id,
                    'title' => $title,
                    'message' => $message,
                    'read' => !is_null($n->read_at),
                    'created_at' => $n->created_at->diffForHumans(),
                ];
            });

        return response()->json(['data' => $notifications]);
    }

    public function markAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();
        return response()->json(['message' => 'Todas as notificações marcadas como lidas']);
    }

    public function clear(Request $request)
    {
        $request->user()->notifications()->delete();
        return response()->json(['message' => 'Notificações limpas']);
    }
}