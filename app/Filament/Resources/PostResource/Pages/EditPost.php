<?php

namespace App\Filament\Resources\PostResource\Pages;

use App\Filament\Resources\PostResource;
use Filament\Actions;
use Filament\Resources\Pages\EditRecord;

class EditPost extends EditRecord
{
    protected static string $resource = PostResource::class;

    protected function authorizeAccess(): void
    {
        parent::authorizeAccess();

        abort_unless(PostResource::canEdit($this->record), 403);
    }

    protected function getHeaderActions(): array
    {
        return [
            Actions\ViewAction::make(),
            Actions\DeleteAction::make()
                ->visible(fn (): bool => PostResource::canDelete($this->record)),

            Actions\Action::make('publish')
                ->label('Publicar')
                ->icon('heroicon-o-paper-airplane')
                ->color('success')
                ->visible(fn (): bool => $this->record->status === 'draft' && PostResource::canEdit($this->record))
                ->action(function () {
                    $this->record->update([
                        'status' => 'published',
                        'published_at' => $this->record->published_at ?? now(),
                    ]);
                    
                    $this->redirect($this->getResource()::getUrl('index'));
                })
                ->requiresConfirmation(),
        ];
    }

    protected function getRedirectUrl(): string
    {
        return $this->getResource()::getUrl('index');
    }
}