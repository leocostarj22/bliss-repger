<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\MyFormulaProductResource\Pages;
use Modules\CRM\Models\MyFormulaProduct;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MyFormulaProductResource extends Resource
{
    protected static ?string $model = MyFormulaProduct::class;

    protected static ?string $navigationIcon = 'heroicon-o-cube';
    protected static ?string $navigationGroup = 'MyFormula';
    protected static ?string $navigationLabel = 'Produtos';
    protected static ?int $navigationSort = 4;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('model')
                    ->label('Modelo/Nome')
                    ->required(),
                Forms\Components\TextInput::make('sku')
                    ->label('SKU'),
                Forms\Components\TextInput::make('price')
                    ->label('Preço')
                    ->numeric()
                    ->prefix('€'),
                Forms\Components\TextInput::make('quantity')
                    ->label('Quantidade')
                    ->numeric(),
                Forms\Components\Toggle::make('status')
                    ->label('Ativo'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('model')
                    ->label('Modelo')
                    ->searchable(),
                Tables\Columns\TextColumn::make('sku')
                    ->searchable(),
                Tables\Columns\TextColumn::make('price')
                    ->money('eur'),
                Tables\Columns\TextColumn::make('quantity'),
                Tables\Columns\IconColumn::make('status')
                    ->boolean(),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListMyFormulaProducts::route('/'),
            'create' => Pages\CreateMyFormulaProduct::route('/create'),
            'edit' => Pages\EditMyFormulaProduct::route('/{record}/edit'),
        ];
    }
}