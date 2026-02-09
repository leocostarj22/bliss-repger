<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\BlissProductResource\Pages;
use Modules\CRM\Models\BlissProduct;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

class BlissProductResource extends Resource
{
    protected static ?string $model = BlissProduct::class;
    protected static ?string $navigationIcon = 'heroicon-o-shopping-bag';
    protected static ?string $navigationGroup = 'Bliss Natura';
    protected static ?string $navigationLabel = 'Produtos';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('model')->label('Modelo')->required(),
                Forms\Components\TextInput::make('price')->label('Preço')->numeric()->prefix('€'),
                Forms\Components\TextInput::make('quantity')->label('Quantidade')->numeric(),
                Forms\Components\Toggle::make('status')->label('Ativo'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('image_url')
                    ->label('Imagem')
                    ->checkFileExistence(false)
                    ->square(),
                Tables\Columns\TextColumn::make('description.name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('model')
                    ->label('Modelo')
                    ->searchable(),
                Tables\Columns\TextColumn::make('price')
                    ->label('Preço')
                    ->money('EUR'),
                Tables\Columns\TextColumn::make('quantity')
                    ->label('Qtd.')
                    ->badge()
                    ->color(fn (int $state): string => match (true) {
                        $state <= 5 => 'danger',
                        $state <= 20 => 'warning',
                        default => 'success',
                    }),
                Tables\Columns\IconColumn::make('status')
                    ->boolean(),
            ])
            ->filters([
                Tables\Filters\Filter::make('status_active')
                    ->label('Apenas Ativos')
                    ->query(fn (Builder $query) => $query->where('status', true))
                    ->toggle(),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->defaultSort('description.name', 'asc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBlissProducts::route('/'),
            'create' => Pages\CreateBlissProduct::route('/create'),
            'edit' => Pages\EditBlissProduct::route('/{record}/edit'),
        ];
    }
}