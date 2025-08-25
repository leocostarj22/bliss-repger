<?php

namespace App\Filament\Resources\HelpArticleResource\Pages;

use App\Filament\Resources\HelpArticleResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;

class ViewHelpArticle extends ViewRecord
{
    protected static string $resource = HelpArticleResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Actions\EditAction::make(),
        ];
    }

    protected function mutateFormDataBeforeFill(array $data): array
    {
        // Incrementar contador de visualizações
        $this->record->incrementViewCount();
        
        return $data;
    }
}