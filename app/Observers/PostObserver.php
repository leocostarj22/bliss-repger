<?php

namespace App\Observers;

use App\Models\Post;
use App\Models\User;
use Filament\Notifications\Notification;

class PostObserver
{
    /**
     * Handle the Post "created" event.
     */
    public function created(Post $post): void
    {
        // Notificar o autor do post
        if ($post->user) {
            Notification::make()
                ->title('Post Criado!')
                ->success()
                ->body('Seu post foi criado com sucesso.')
                ->sendToDatabase($post->user);
        }

        // Se o post for publicado, notificar todos os usuários da empresa
        if ($post->is_published && $post->company_id) {
            $companyUsers = User::where('company_id', $post->company_id)
                ->where('id', '!=', $post->user_id) // Não notificar o autor
                ->get();

            foreach ($companyUsers as $user) {
                Notification::make()
                    ->title('Novo Comunicado!')
                    ->info()
                    ->body($post->title)
                    ->sendToDatabase($user);
            }
        }
    }

    /**
     * Handle the Post "updated" event.
     */
    public function updated(Post $post): void
    {
        // Notificar o autor sobre a atualização
        if ($post->user) {
            Notification::make()
                ->title('Post Atualizado!')
                ->success()
                ->body('Seu post foi atualizado com sucesso.')
                ->sendToDatabase($post->user);
        }

        // Se o post foi fixado, notificar todos os usuários da empresa
        if ($post->wasChanged('is_pinned') && $post->is_pinned && $post->company_id) {
            $companyUsers = User::where('company_id', $post->company_id)
                ->where('id', '!=', $post->user_id)
                ->get();

            foreach ($companyUsers as $user) {
                Notification::make()
                    ->title('Post Importante Fixado!')
                    ->warning()
                    ->body($post->title)
                    ->sendToDatabase($user);
            }
        }
    }

    /**
     * Handle the Post "deleted" event.
     */
    public function deleted(Post $post): void
    {
        // Notificar o autor sobre a exclusão
        if ($post->user) {
            Notification::make()
                ->title('Post Removido!')
                ->warning()
                ->body('Seu post foi removido.')
                ->sendToDatabase($post->user);
        }
    }

    /**
     * Handle the Post "restored" event.
     */
    public function restored(Post $post): void
    {
        //
    }

    /**
     * Handle the Post "force deleted" event.
     */
    public function forceDeleted(Post $post): void
    {
        //
    }
}