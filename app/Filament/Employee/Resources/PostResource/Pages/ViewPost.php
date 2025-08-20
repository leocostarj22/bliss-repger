<?php

namespace App\Filament\Employee\Resources\PostResource\Pages;

use App\Filament\Employee\Resources\PostResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use App\Models\Post;

class ViewPost extends ViewRecord
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Sem ações de edição ou exclusão
        ];
    }
    
    protected function mutateFormDataBeforeFill(array $data): array
    {
        // Incrementar visualizações quando o post é visualizado
        $this->record->incrementViews();
        
        return $data;
    }
    
    public function getTitle(): string
    {
        return $this->record->title;
    }
}