<?php

namespace App\Filament\Employee\Resources;

use App\Filament\Employee\Resources\PostResource\Pages;
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
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Actions\Action;
use Illuminate\Database\Eloquent\Model;

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
        // Formulário somente leitura para visualização
        return $form
            ->schema([
                Forms\Components\Section::make('Informações do Post')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('Título')
                            ->disabled(),
                        
                        Forms\Components\RichEditor::make('content')
                            ->label('Conteúdo')
                            ->disabled()
                            ->columnSpanFull(),
                        
                        Forms\Components\Select::make('type')
                            ->label('Tipo')
                            ->options([
                                'text' => 'Texto',
                                'image' => 'Imagem',
                                'video' => 'Vídeo',
                                'announcement' => 'Comunicado Oficial',
                            ])
                            ->disabled(),
                        
                        Forms\Components\Select::make('priority')
                            ->label('Prioridade')
                            ->options([
                                'normal' => 'Normal',
                                'important' => 'Importante',
                                'urgent' => 'Urgente',
                            ])
                            ->disabled(),
                        
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'draft' => 'Rascunho',
                                'published' => 'Publicado',
                                'archived' => 'Arquivado',
                            ])
                            ->disabled(),
                        
                        Forms\Components\Toggle::make('is_pinned')
                            ->label('Post Fixado')
                            ->disabled(),
                    ])
                    ->columns(2),
                    
                Forms\Components\Section::make('Mídia')
                    ->schema([
                        Forms\Components\FileUpload::make('featured_image_url')
                            ->label('Imagem em Destaque')
                            ->disabled(),
                        
                        Forms\Components\TextInput::make('youtube_video_url')
                            ->label('URL do Vídeo YouTube')
                            ->disabled(),
                    ])
                    ->columns(2)
                    ->collapsible(),
                    
                Forms\Components\Section::make('Informações de Publicação')
                    ->schema([
                        Forms\Components\TextInput::make('author.name')
                            ->label('Autor')
                            ->disabled(),
                        
                        Forms\Components\DateTimePicker::make('published_at')
                            ->label('Data de Publicação')
                            ->disabled(),
                        
                        Forms\Components\DateTimePicker::make('expires_at')
                            ->label('Data de Expiração')
                            ->disabled(),
                    ])
                    ->columns(2)
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(function (Builder $query) {
                $employeeUser = Auth::user();
                $employee = $employeeUser->employee;
                
                return $query->published()
                    ->when($employee && $employee->department_id, function ($q) use ($employee) {
                        $q->forDepartment($employee->department_id);
                    })
                    ->orderByDesc('is_pinned')
                    ->orderByDesc('published_at');
            })
            ->columns([
                Tables\Columns\ImageColumn::make('featured_image_url')
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
                    ->formatStateUsing(fn ($state, $record) => $record->author?->name ?? 'Autor desconhecido')
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
                    
                Tables\Columns\IconColumn::make('is_pinned')
                    ->label('Fixado')
                    ->boolean()
                    ->trueIcon('heroicon-o-bookmark')
                    ->falseIcon('heroicon-o-bookmark-slash'),
                    
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
                // Apenas ação de visualização
                Tables\Actions\ViewAction::make()
                    ->label('Visualizar')
                    ->modalWidth('7xl')
                    ->action(function (Post $record) {
                        // Incrementar contador de visualizações
                        $record->incrementViews();
                    }),
            ])
            ->bulkActions([
                // Sem ações em massa para funcionários
            ])
            ->defaultSort('is_pinned', 'desc')
            ->defaultSort('published_at', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            // Sem relation managers para funcionários
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPosts::route('/'),
            'view' => Pages\ViewPost::route('/{record}'),
            // Sem páginas de criação ou edição
        ];
    }
    
    // Desabilitar criação, edição e exclusão
    public static function canCreate(): bool
    {
        return false;
    }
    
    public static function canEdit(Model $record): bool
    {
        return false;
    }
    
    public static function canDelete(Model $record): bool
    {
        return false;
    }
    
    public static function canDeleteAny(): bool
    {
        return false;
    }
}