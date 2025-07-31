<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PostResource\Pages;
use App\Filament\Resources\PostResource\RelationManagers;
use App\Models\Post;
use App\Models\Department;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Filament\Support\Enums\FontWeight;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Grid;
use Filament\Forms\Components\Tabs;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Actions\Action;

class PostResource extends Resource
{
    protected static ?string $model = Post::class;

    protected static ?string $navigationIcon = 'heroicon-o-megaphone';
    
    protected static ?string $navigationLabel = 'Posts Administrativos';
    
    protected static ?string $modelLabel = 'Post';
    
    protected static ?string $pluralModelLabel = 'Posts';
    
    protected static ?string $navigationGroup = 'Comunicação';
    
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Tabs::make('Conteúdo')
                    ->tabs([
                        Tabs\Tab::make('Informações Básicas')
                            ->schema([
                                Section::make('Conteúdo do Post')
                                    ->schema([
                                        Forms\Components\TextInput::make('title')
                                            ->label('Título')
                                            ->required()
                                            ->maxLength(255)
                                            ->columnSpanFull(),
                                        
                                        Forms\Components\RichEditor::make('content')
                                            ->label('Conteúdo')
                                            ->required()
                                            ->toolbarButtons([
                                                'attachFiles',
                                                'blockquote',
                                                'bold',
                                                'bulletList',
                                                'codeBlock',
                                                'h2',
                                                'h3',
                                                'italic',
                                                'link',
                                                'orderedList',
                                                'redo',
                                                'strike',
                                                'underline',
                                                'undo',
                                            ])
                                            ->columnSpanFull(),
                                    ])
                                    ->columns(2),
                                    
                                Section::make('Configurações')
                                    ->schema([
                                        Forms\Components\Select::make('type')
                                            ->label('Tipo de Post')
                                            ->options([
                                                'text' => 'Texto',
                                                'image' => 'Imagem',
                                                'video' => 'Vídeo',
                                                'announcement' => 'Comunicado Oficial',
                                            ])
                                            ->default('text')
                                            ->required()
                                            ->reactive(),
                                            
                                        Forms\Components\Select::make('priority')
                                            ->label('Prioridade')
                                            ->options([
                                                'normal' => 'Normal',
                                                'important' => 'Importante',
                                                'urgent' => 'Urgente',
                                            ])
                                            ->default('normal')
                                            ->required(),
                                            
                                        Forms\Components\Select::make('status')
                                            ->label('Status')
                                            ->options([
                                                'draft' => 'Rascunho',
                                                'published' => 'Publicado',
                                                'archived' => 'Arquivado',
                                            ])
                                            ->default('draft')
                                            ->required(),
                                            
                                        Forms\Components\Toggle::make('is_pinned')
                                            ->label('Fixar Post')
                                            ->helperText('Posts fixados aparecem no topo')
                                            ->default(false),
                                    ])
                                    ->columns(2),
                            ]),
                            
                        Tabs\Tab::make('Mídia')
                            ->schema([
                                Section::make('Imagem em Destaque')
                                    ->schema([
                                        // Na seção de formulário (linha ~120):
                                        Forms\Components\FileUpload::make('featured_image_url') // Alterado de 'featured_image'
                                        ->label('Imagem em Destaque')
                                        ->image()
                                        ->directory('posts/images')
                                        ->visibility('public')
                                        ->imageEditor()
                                        ->imageEditorAspectRatios([
                                            '16:9',
                                            '4:3',
                                            '1:1',
                                        ])
                                        ->columnSpanFull(),
                                    ]),
                                    
                                Section::make('Vídeo do YouTube')
                                    ->schema([
                                        // Na seção de formulário para vídeo (linha ~140):
                                        Forms\Components\TextInput::make('youtube_video_url') // Alterado de 'video_url'
                                            ->label('URL do Vídeo YouTube')
                                            ->url()
                                            ->helperText('Cole a URL completa do vídeo do YouTube')
                                            ->placeholder('https://www.youtube.com/watch?v=...')
                                            ->columnSpanFull(),
                                    
                                    // Na seção de anexos (linha ~150):
                                    Forms\Components\FileUpload::make('attachment_urls') // Alterado de 'attachments'
                                        ->label('Anexos')
                                        ->multiple()
                                        ->directory('posts/attachments')
                                        ->visibility('public')
                                        ->acceptedFileTypes(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'])
                                        ->maxSize(10240)
                                        ->columnSpanFull(),
                                    ]),
                                    
                                Section::make('Anexos')
                                    ->schema([
                                        Forms\Components\Repeater::make('attachments')
                                            ->label('Anexos')
                                            ->schema([
                                                Forms\Components\TextInput::make('name')
                                                    ->label('Nome do Arquivo')
                                                    ->required(),
                                                Forms\Components\FileUpload::make('path')
                                                    ->label('Arquivo')
                                                    ->directory('posts/attachments')
                                                    ->visibility('public')
                                                    ->required(),
                                            ])
                                            ->columns(2)
                                            ->columnSpanFull(),
                                    ]),
                            ]),
                            
                        Tabs\Tab::make('Visibilidade')
                            ->schema([
                                Section::make('Controle de Acesso')
                                    ->schema([
                                        Forms\Components\Select::make('visible_departments')
                                            ->label('Departamentos com Acesso')
                                            ->multiple()
                                            ->options(Department::pluck('name', 'id'))
                                            ->helperText('Deixe vazio para tornar visível a todos os departamentos')
                                            ->columnSpanFull(),
                                            
                                        Forms\Components\DateTimePicker::make('published_at')
                                            ->label('Data de Publicação')
                                            ->helperText('Deixe vazio para publicar imediatamente')
                                            ->default(now()),
                                            
                                        Forms\Components\DateTimePicker::make('expires_at')
                                            ->label('Data de Expiração')
                                            ->helperText('Deixe vazio para nunca expirar'),
                                    ])
                                    ->columns(2),
                            ]),
                    ])
                    ->columnSpanFull(),
                    
                Forms\Components\Hidden::make('author_id')
                    ->default(Auth::id()),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                // Na seção de tabela (linha ~200):
                Tables\Columns\ImageColumn::make('featured_image_url') // Alterado de 'featured_image'
                ->label('Imagem')
                ->circular()
                ->size(40)
                ->defaultImageUrl(asset('images/default-post.png')),
                    
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable()
                    ->weight(FontWeight::Medium)
                    ->limit(50),
                    
                Tables\Columns\TextColumn::make('author.name')
                    ->label('Autor')
                    ->sortable(),
                    
                Tables\Columns\BadgeColumn::make('type')
                    ->label('Tipo')
                    ->colors([
                        'primary' => 'text',
                        'success' => 'image',
                        'warning' => 'video',
                        'danger' => 'announcement',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'text' => 'Texto',
                        'image' => 'Imagem',
                        'video' => 'Vídeo',
                        'announcement' => 'Comunicado',
                        default => $state,
                    }),
                    
                Tables\Columns\BadgeColumn::make('priority')
                    ->label('Prioridade')
                    ->colors([
                        'gray' => 'normal',
                        'warning' => 'important',
                        'danger' => 'urgent',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'normal' => 'Normal',
                        'important' => 'Importante',
                        'urgent' => 'Urgente',
                        default => $state,
                    }),
                    
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'gray' => 'draft',
                        'success' => 'published',
                        'warning' => 'archived',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'draft' => 'Rascunho',
                        'published' => 'Publicado',
                        'archived' => 'Arquivado',
                        default => $state,
                    }),
                    
                Tables\Columns\IconColumn::make('is_pinned')
                    ->label('Fixado')
                    ->boolean()
                    ->trueIcon('heroicon-o-bookmark')
                    ->falseIcon('heroicon-o-bookmark-slash'),
                    
                Tables\Columns\TextColumn::make('likes_count')
                    ->label('Curtidas')
                    ->numeric()
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('views_count')
                    ->label('Visualizações')
                    ->numeric()
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('published_at')
                    ->label('Publicado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'draft' => 'Rascunho',
                        'published' => 'Publicado',
                        'archived' => 'Arquivado',
                    ]),
                    
                SelectFilter::make('type')
                    ->label('Tipo')
                    ->options([
                        'text' => 'Texto',
                        'image' => 'Imagem',
                        'video' => 'Vídeo',
                        'announcement' => 'Comunicado',
                    ]),
                    
                SelectFilter::make('priority')
                    ->label('Prioridade')
                    ->options([
                        'normal' => 'Normal',
                        'important' => 'Importante',
                        'urgent' => 'Urgente',
                    ]),
                    
                Tables\Filters\Filter::make('is_pinned')
                    ->label('Posts Fixados')
                    ->query(fn (Builder $query): Builder => $query->where('is_pinned', true)),
            ])
            ->actions([
                Action::make('publish')
                    ->label('Publicar')
                    ->icon('heroicon-o-paper-airplane')
                    ->color('success')
                    ->visible(fn (Post $record): bool => $record->status === 'draft')
                    ->action(function (Post $record) {
                        $record->update([
                            'status' => 'published',
                            'published_at' => $record->published_at ?? now(),
                        ]);
                    })
                    ->requiresConfirmation(),
                    
                Action::make('pin')
                    ->label(fn (Post $record): string => $record->is_pinned ? 'Desafixar' : 'Fixar')
                    ->icon(fn (Post $record): string => $record->is_pinned ? 'heroicon-o-bookmark-slash' : 'heroicon-o-bookmark')
                    ->color(fn (Post $record): string => $record->is_pinned ? 'warning' : 'primary')
                    ->action(fn (Post $record) => $record->update(['is_pinned' => !$record->is_pinned])),
                    
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                    
                    Tables\Actions\BulkAction::make('publish')
                        ->label('Publicar Selecionados')
                        ->icon('heroicon-o-paper-airplane')
                        ->color('success')
                        ->action(function ($records) {
                            $records->each(function ($record) {
                                if ($record->status === 'draft') {
                                    $record->update([
                                        'status' => 'published',
                                        'published_at' => $record->published_at ?? now(),
                                    ]);
                                }
                            });
                        })
                        ->requiresConfirmation(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            // RelationManagers\CommentsRelationManager::class, // Removido
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'create' => Pages\CreatePost::route('/create'),
            'view' => Pages\ViewPost::route('/{record}'),
            'edit' => Pages\EditPost::route('/{record}/edit'),
        ];
    }
}