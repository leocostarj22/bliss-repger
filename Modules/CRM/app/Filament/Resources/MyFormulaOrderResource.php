<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\MyFormulaOrderResource\Pages;
use Modules\CRM\Models\MyFormulaOrder;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class MyFormulaOrderResource extends Resource
{
    protected static ?string $model = MyFormulaOrder::class;

    protected static ?string $navigationIcon = 'heroicon-o-shopping-cart';
    protected static ?string $navigationGroup = 'MyFormula';
    protected static ?string $navigationLabel = 'Pedidos';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\TextInput::make('invoice_no')
                    ->label('Fatura'),
                Forms\Components\TextInput::make('firstname')
                    ->required(),
                Forms\Components\TextInput::make('lastname')
                    ->required(),
                Forms\Components\TextInput::make('email')
                    ->email()
                    ->required(),
                Forms\Components\TextInput::make('total')
                    ->numeric()
                    ->prefix('€'),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('order_id')
                    ->label('ID')
                    ->sortable(),
                Tables\Columns\TextColumn::make('firstname')
                    ->label('Nome')
                    ->searchable(),
                Tables\Columns\TextColumn::make('email')
                    ->searchable(),
                Tables\Columns\TextColumn::make('total')
                    ->money('eur')
                    ->sortable(),
                Tables\Columns\TextColumn::make('date_added')
                    ->dateTime()
                    ->sortable(),
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
            'index' => Pages\ListMyFormulaOrders::route('/'),
            'create' => Pages\CreateMyFormulaOrder::route('/create'),
            'edit' => Pages\EditMyFormulaOrder::route('/{record}/edit'),
        ];
    }
}