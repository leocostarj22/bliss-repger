<?php

namespace App\Filament\Resources;

use App\Filament\Resources\HelpArticleResource\Pages;
use App\Models\HelpArticle;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Forms\Components\RichEditor;
use Filament\Forms\Components\TagsInput;
use Filament\Tables\Filters\SelectFilter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Str;

class HelpArticleResource extends Resource
{
    protected static ?string $model = HelpArticle::class;

    protected static ?string $navigationIcon = 'heroicon-o-question-mark-circle';
    protected static ?string $navigationLabel = 'Artigos de Ajuda';
    protected static ?string $navigationGroup = 'Sistema';
    protected static ?int $navigationSort = 5;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações Básicas')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('Título')
                            ->required()
                            ->maxLength(255)
                            ->live(onBlur: true)
                            ->afterStateUpdated(fn (string $context, $state, callable $set) => 
                                $context === 'edit' ? null : $set('slug', Str::slug($state))
                            ),
                        
                        Forms\Components\TextInput::make('slug')
                            ->label('Slug')
                            ->required()
                            ->maxLength(255)
                            ->unique(HelpArticle::class, 'slug', ignoreRecord: true),
                        
                        Forms\Components\Select::make('category')
                            ->label('Categoria')
                            ->required()
                            ->options([
                                'tickets' => 'Tickets',
                                'tasks' => 'Tarefas',
                                'messages' => 'Mensagens',
                                'general' => 'Geral',
                                'faq' => 'FAQ',
                            ]),
                        
                        Forms\Components\Select::make('target_audience')
                            ->label('Público Alvo')
                            ->required()
                            ->options([
                                'admin' => 'Administradores',
                                'employee' => 'Colaboradores',
                                'both' => 'Ambos',
                            ])
                            ->default('both'),
                    ])->columns(2),

                Forms\Components\Section::make('Conteúdo')
                    ->schema([
                        Forms\Components\Textarea::make('excerpt')
                            ->label('Resumo')
                            ->rows(3)
                            ->maxLength(500),
                        
                        RichEditor::make('content')
                            ->label('Conteúdo')
                            ->required()
                            ->columnSpanFull(),
                    ]),

                Forms\Components\Section::make('Configurações')
                    ->schema([
                        TagsInput::make('tags')
                            ->label('Tags')
                            ->placeholder('Digite uma tag e pressione Enter'),
                        
                        Forms\Components\TextInput::make('sort_order')
                            ->label('Ordem de Exibição')
                            ->numeric()
                            ->default(0),
                        
                        Forms\Components\Toggle::make('is_published')
                            ->label('Publicado')
                            ->default(true),
                        
                        Forms\Components\Toggle::make('featured')
                            ->label('Destacado')
                            ->default(false),
                    ])->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->defaultPaginationPageSize(25)
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\BadgeColumn::make('category')
                    ->label('Categoria')
                    ->colors([
                        'primary' => 'tickets',
                        'success' => 'tasks',
                        'warning' => 'messages',
                        'secondary' => 'general',
                        'info' => 'faq',
                    ]),
                
                Tables\Columns\BadgeColumn::make('target_audience')
                    ->label('Público')
                    ->colors([
                        'danger' => 'admin',
                        'success' => 'employee',
                        'primary' => 'both',
                    ]),
                
                Tables\Columns\TextColumn::make('view_count')
                    ->label('Visualizações')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('helpful_percentage')
                    ->label('% Útil')
                    ->suffix('%')
                    ->sortable(),
                
                Tables\Columns\IconColumn::make('is_published')
                    ->label('Publicado')
                    ->boolean(),
                
                Tables\Columns\IconColumn::make('featured')
                    ->label('Destacado')
                    ->boolean(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime()
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('category')
                    ->label('Categoria')
                    ->options([
                        'tickets' => 'Tickets',
                        'tasks' => 'Tarefas',
                        'messages' => 'Mensagens',
                        'general' => 'Geral',
                        'faq' => 'FAQ',
                    ]),
                
                SelectFilter::make('target_audience')
                    ->label('Público Alvo')
                    ->options([
                        'admin' => 'Administradores',
                        'employee' => 'Colaboradores',
                        'both' => 'Ambos',
                    ]),
                
                Tables\Filters\TernaryFilter::make('is_published')
                    ->label('Publicado'),
                
                Tables\Filters\TernaryFilter::make('featured')
                    ->label('Destacado'),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('sort_order')
            ->reorderable('sort_order');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListHelpArticles::route('/'),
            'create' => Pages\CreateHelpArticle::route('/create'),
            'view' => Pages\ViewHelpArticle::route('/{record}'),
            'edit' => Pages\EditHelpArticle::route('/{record}/edit'),
        ];
    }
}