<?php

namespace App\Notifications;

use App\Models\VideoCall;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class VideoCallInviteNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public VideoCall $call) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Convite para Videochamada')
            ->line('Você foi convidado para uma videochamada.')
            ->action('Entrar na sala', route('video-call.show', $this->call->room_id));
    }

    public function toArray(object $notifiable): array
    {
        return [
            'room_id' => $this->call->room_id,
            'created_by' => $this->call->created_by,
        ];
    }
}
