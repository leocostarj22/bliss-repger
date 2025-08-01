<?php

namespace App\Filament\Resources\PostResource\Pages;

use App\Filament\Resources\PostResource;
use Filament\Actions;
use Filament\Resources\Pages\ViewRecord;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\ImageEntry;
use Filament\Infolists\Components\Section;
use Filament\Support\Enums\FontWeight;
use Filament\Infolists\Components\ViewEntry;
use Filament\Infolists\Components\Grid;
use Illuminate\Support\Facades\Auth;

class ViewPost extends ViewRecord
{
    protected static string $resource = PostResource::class;

    // Adicionar este método para incrementar visualizações
    public function mount(int | string $record): void
    {
        parent::mount($record);
        
        // Incrementar visualizações apenas se o post estiver publicado
        if ($this->record->status === 'published') {
            $this->record->incrementViews();
        }
    }

    protected function getHeaderActions(): array
    {
        $actions = [];
        
        // Só mostrar a opção de editar se o usuário for o autor do post
        if (Auth::id() === $this->record->author_id) {
            $actions[] = Actions\EditAction::make();
        }
        
        return $actions;
    }

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                // Cabeçalho do Post (estilo Facebook)
                Section::make()
                    ->schema([
                        Grid::make([
                            'default' => 1,
                        ])
                        ->schema([
                            // Informações do autor, data e tipo
                            TextEntry::make('author.name')
                                ->label('')
                                ->weight(FontWeight::Bold)
                                ->size('lg')
                                ->formatStateUsing(function ($record) {
                                    $publishedAt = $record->published_at ? $record->published_at->diffForHumans() : 'Não publicado';
                                    $type = match ($record->type) {
                                        'text' => 'Texto',
                                        'image' => 'Imagem', 
                                        'video' => 'Vídeo',
                                        'announcement' => 'Comunicado',
                                        default => $record->type,
                                    };
                                    return ($record->author?->name ?? 'Autor desconhecido') . ' • ' . $publishedAt . ' • ' . $type;
                                }),
                            
                            // Título do post
                            TextEntry::make('title')
                                ->label('')
                                ->weight(FontWeight::Medium)
                                ->size('xl')
                                ->visible(fn ($record) => !empty($record->title)),
                        ]),
                    ])
                    ->compact(),
                    
                // Conteúdo Principal
                Section::make()
                    ->schema([
                        // Conteúdo de texto
                        TextEntry::make('content')
                            ->label('')
                            ->html()
                            ->visible(fn ($record) => !empty($record->content))
                            ->columnSpanFull(),
                            
                        // Imagem em destaque
                        ImageEntry::make('featured_image_url')
                            ->label('')
                            ->visible(fn ($record) => $record->featured_image_url)
                            ->width('100%')
                            ->height('auto')
                            ->extraAttributes([
                                'style' => 'border-radius: 8px; margin: 12px 0;'
                            ])
                            ->columnSpanFull(),
                            
                        // Vídeo do YouTube
                        ViewEntry::make('youtube_video_url')
                            ->label('')
                            ->view('components.youtube-video')
                            ->visible(fn ($record) => $record->youtube_video_url)
                            ->columnSpanFull(),
                    ])
                    ->compact(),
                    
                // Estatísticas e Interações (estilo Facebook)
                Section::make()
                    ->schema([
                        Grid::make([
                            'default' => 3,
                        ])
                        ->schema([
                            TextEntry::make('likes_count')
                                ->label('')
                                ->formatStateUsing(fn ($state) => "👍 {$state} curtidas")
                                ->color('primary'),
                                
                            TextEntry::make('views_count')
                                ->label('')
                                ->formatStateUsing(fn ($state) => "👁️ {$state} visualizações")
                                ->color('gray'),
                                
                            TextEntry::make('comments_count')
                                ->label('')
                                ->formatStateUsing(fn ($record) => "💬 0 comentários") // Alterado para mostrar sempre 0
                                ->color('gray'),
                        ]),
                    ])
                    ->compact(),
                    
                // Informações Administrativas (colapsível)
                Section::make('Detalhes Administrativos')
                    ->schema([
                        Grid::make([
                            'default' => 2,
                        ])
                        ->schema([
                            TextEntry::make('status')
                                ->label('Status')
                                ->badge()
                                ->color(fn (string $state): string => match ($state) {
                                    'draft' => 'gray',
                                    'published' => 'success',
                                    'archived' => 'warning',
                                    default => 'gray',
                                })
                                ->formatStateUsing(fn (string $state): string => match ($state) {
                                    'draft' => 'Rascunho',
                                    'published' => 'Publicado',
                                    'archived' => 'Arquivado',
                                    default => $state,
                                }),
                                
                            TextEntry::make('priority')
                                ->label('Prioridade')
                                ->badge()
                                ->color(fn (string $state): string => match ($state) {
                                    'normal' => 'gray',
                                    'important' => 'warning',
                                    'urgent' => 'danger',
                                    default => 'gray',
                                })
                                ->formatStateUsing(fn (string $state): string => match ($state) {
                                    'normal' => 'Normal',
                                    'important' => 'Importante',
                                    'urgent' => 'Urgente',
                                    default => $state,
                                }),
                                
                            TextEntry::make('published_at')
                                ->label('Publicado em')
                                ->dateTime('d/m/Y H:i'),
                                
                            TextEntry::make('expires_at')
                                ->label('Expira em')
                                ->dateTime('d/m/Y H:i')
                                ->placeholder('Nunca expira'),
                        ]),
                    ])
                    ->collapsible()
                    ->collapsed(),
                    
            ]);
    }
}