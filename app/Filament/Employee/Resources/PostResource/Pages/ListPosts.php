<?php

namespace App\Filament\Employee\Resources\PostResource\Pages;

use App\Filament\Employee\Resources\PostResource;
use Filament\Actions;
use Filament\Resources\Pages\ListRecords;

class ListPosts extends ListRecords
{
    protected static string $resource = PostResource::class;

    protected function getHeaderActions(): array
    {
        return [
            // Sem ações de criação para funcionários
        ];
    }
    
    public function getTitle(): string
    {
        return 'Posts Administrativos';
    }
    
    public function getSubheading(): ?string
    {
        return 'Comunicados e informações da administração';
    }
}