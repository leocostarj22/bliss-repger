<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PersonalNoteResource\Pages;
use App\Models\PersonalNote;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class PersonalNoteResource extends Resource
{
    protected static ?string $model = PersonalNote::class;

    protected static ?string $navigationIcon = 'heroicon-o-pencil-square';
    
    protected static ?string $navigationLabel = 'Minhas Anotações';
    
    protected static ?string $modelLabel = 'Anotação';
    
    protected static ?string $pluralModelLabel = 'Minhas Anotações';
    
    protected static ?string $navigationGroup = 'Pessoal';
    
    protected static ?int $navigationSort = 2;

    public static function getEloquentQuery(): Builder
    {
        // Filter to show only the authenticated user's notes OR notes shared with them
        return parent::getEloquentQuery()->where(function ($query) {
            $query->where('user_id', auth()->id())
                  ->orWhereHas('sharedWith', function ($q) {
                      $q->where('users.id', auth()->id());
                  });
        });
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('title')
                    ->label('Título')
                    ->required()
                    ->maxLength(255)
                    ->columnSpanFull(),
                
                Forms\Components\RichEditor::make('content')
                    ->label('Conteúdo')
                    ->columnSpanFull()
                    ->fileAttachmentsDirectory('personal-notes-attachments'),

                Forms\Components\ColorPicker::make('color')
                    ->label('Cor de Fundo')
                    ->default('#ffffff'),

                Forms\Components\Toggle::make('is_favorite')
                    ->label('Favorito')
                    ->default(false),
                
                Forms\Components\Select::make('sharedWith')
                    ->label('Partilhar com')
                    ->relationship('sharedWith', 'name')
                    ->multiple()
                    ->preload()
                    ->searchable()
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable()
                    ->description(fn (PersonalNote $record) => $record->user_id !== auth()->id() ? 'Partilhado por ' . $record->user->name : null),
                
                Tables\Columns\IconColumn::make('is_favorite')
                    ->label('Favorito')
                    ->boolean()
                    ->sortable(),

                Tables\Columns\ColorColumn::make('color')
                    ->label('Cor'),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
                    
                Tables\Columns\TextColumn::make('updated_at')
                    ->label('Última Modificação')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->description(fn (PersonalNote $record) => $record->lastModifiedBy ? 'por ' . $record->lastModifiedBy->name : null),
            ])
            ->filters([
                Tables\Filters\Filter::make('is_favorite')
                    ->label('Apenas Favoritos')
                    ->query(fn (Builder $query): Builder => $query->where('is_favorite', true)),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListPersonalNotes::route('/'),
            'create' => Pages\CreatePersonalNote::route('/create'),
            'edit' => Pages\EditPersonalNote::route('/{record}/edit'),
        ];
    }
}