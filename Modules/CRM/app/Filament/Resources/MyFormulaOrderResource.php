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
                Forms\Components\Section::make('Detalhes do Pedido')
                    ->schema([
                        Forms\Components\TextInput::make('order_id')
                            ->label('ID do Pedido')
                            ->disabled(),
                        Forms\Components\TextInput::make('date_added')
                            ->label('Data do Pedido')
                            ->disabled(),
                        Forms\Components\Select::make('order_status_id')
                            ->label('Situação')
                            ->relationship('status', 'name')
                            ->disabled(),
                        Forms\Components\TextInput::make('payment_method')
                            ->label('Forma de Pagamento'),
                        Forms\Components\TextInput::make('total')
                            ->label('Total')
                            ->prefix('€')
                            ->disabled(),
                    ])->columns(3),

                Forms\Components\Section::make('Cliente')
                    ->schema([
                        Forms\Components\TextInput::make('firstname')
                            ->label('Nome')
                            ->disabled(),
                        Forms\Components\TextInput::make('lastname')
                            ->label('Sobrenome')
                            ->disabled(),
                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->disabled(),
                        Forms\Components\TextInput::make('telephone')
                            ->label('Telefone')
                            ->disabled(),
                    ])->columns(2),

                Forms\Components\Section::make('Itens do Pedido')
                    ->schema([
                        Forms\Components\Repeater::make('products')
                            ->relationship('products')
                            ->schema([
                                Forms\Components\TextInput::make('name')
                                    ->label('Produto')
                                    ->disabled(),
                                Forms\Components\TextInput::make('model')
                                    ->label('Modelo')
                                    ->disabled(),
                                Forms\Components\TextInput::make('quantity')
                                    ->label('Qtd')
                                    ->disabled(),
                                Forms\Components\TextInput::make('price')
                                    ->label('Preço Unit.')
                                    ->prefix('€')
                                    ->disabled(),
                                Forms\Components\TextInput::make('total')
                                    ->label('Total')
                                    ->prefix('€')
                                    ->disabled(),
                                
                                Forms\Components\Repeater::make('options')
                                    ->relationship('options')
                                    ->label('Detalhes Adicionais (Quiz/Suplementação)')
                                    ->schema([
                                        Forms\Components\TextInput::make('name')
                                            ->label('Opção')
                                            ->disabled(),
                                        Forms\Components\TextInput::make('value')
                                            ->label('Valor')
                                            ->disabled(),
                                    ])
                                    ->columns(2)
                                    ->addable(false)
                                    ->deletable(false)
                                    ->reorderable(false)
                                    ->columnSpanFull(),
                            ])
                            ->columns(5)
                            ->addable(false)
                            ->deletable(false)
                            ->reorderable(false),
                    ]),
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
                Tables\Columns\TextColumn::make('status.name')
                    ->label('Situação')
                    ->badge()
                    ->color(fn (string $state): string => match (true) {
                        str_contains(strtolower($state), 'pend') => 'gray',
                        str_contains(strtolower($state), 'process') => 'warning',
                        str_contains(strtolower($state), 'envi') => 'info',
                        str_contains(strtolower($state), 'ship') => 'info',
                        str_contains(strtolower($state), 'complet') => 'success',
                        str_contains(strtolower($state), 'cancel') => 'danger',
                        str_contains(strtolower($state), 'refund') => 'danger',
                        default => 'primary',
                    }),
                Tables\Columns\TextColumn::make('total')
                    ->money('eur')
                    ->sortable(),
                Tables\Columns\TextColumn::make('date_added')
                    ->dateTime('d/m/Y H:i')
                    ->sortable(),
            ])
            ->defaultSort('order_id', 'desc')
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