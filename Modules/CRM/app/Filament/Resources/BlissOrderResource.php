<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\BlissOrderResource\Pages;
use Modules\CRM\Models\BlissOrder;
use Modules\CRM\Models\BlissOrderStatus;
use Illuminate\Database\Eloquent\Builder;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

use Filament\Infolists;
use Filament\Infolists\Infolist;

class BlissOrderResource extends Resource
{
    protected static ?string $model = BlissOrder::class;
    protected static ?string $navigationIcon = 'heroicon-o-shopping-cart';
    protected static ?string $navigationGroup = 'Bliss Natura';
    protected static ?string $navigationLabel = 'Pedidos';
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Informações do Cliente')
                ->schema([
                    Forms\Components\TextInput::make('firstname')->label('Nome')->disabled(),
                    Forms\Components\TextInput::make('lastname')->label('Apelido')->disabled(),
                    Forms\Components\TextInput::make('email')->label('Email')->disabled(),
                    Forms\Components\TextInput::make('telephone')->label('Telefone')->disabled(),
                ])->columns(2),
            
            Forms\Components\Section::make('Detalhes do Pedido')
                ->schema([
                    Forms\Components\DateTimePicker::make('date_added')->label('Data da Compra')->disabled(),
                    Forms\Components\TextInput::make('payment_method')->label('Método de Pagamento')->disabled(),
                    Forms\Components\TextInput::make('shipping_method')->label('Método de Envio')->disabled(),
                    Forms\Components\TextInput::make('total')->label('Total')->prefix('€')->disabled(),
                ])->columns(2),

            Forms\Components\Section::make('Produtos')
                ->schema([
                    Forms\Components\Repeater::make('products')
                        ->relationship()
                        ->schema([
                            Forms\Components\TextInput::make('name')->label('Produto')->disabled(),
                            Forms\Components\TextInput::make('model')->label('Modelo')->disabled(),
                            Forms\Components\TextInput::make('quantity')->label('Qtd')->disabled(),
                            Forms\Components\TextInput::make('price')->label('Preço Unit.')->prefix('€')->disabled(),
                            Forms\Components\TextInput::make('total')->label('Subtotal')->prefix('€')->disabled(),
                        ])
                        ->columns(5)
                        ->addable(false)
                        ->deletable(false)
                        ->reorderable(false),
                ]),
        ]);
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Infolists\Components\Section::make('Informações do Cliente')
                    ->schema([
                        Infolists\Components\TextEntry::make('firstname')->label('Nome'),
                        Infolists\Components\TextEntry::make('lastname')->label('Apelido'),
                        Infolists\Components\TextEntry::make('email')->label('Email'),
                        Infolists\Components\TextEntry::make('telephone')->label('Telefone'),
                    ])->columns(2),
                
                Infolists\Components\Section::make('Detalhes do Pedido')
                    ->schema([
                        Infolists\Components\TextEntry::make('order_id')->label('ID Pedido'),
                        Infolists\Components\TextEntry::make('date_added')->label('Data da Compra')->dateTime(),
                        Infolists\Components\TextEntry::make('status.name')->label('Estado')->badge(),
                        Infolists\Components\TextEntry::make('payment_method')->label('Método de Pagamento'),
                        Infolists\Components\TextEntry::make('shipping_method')->label('Método de Envio'),
                        Infolists\Components\TextEntry::make('total')->label('Total')->money('EUR'),
                    ])->columns(3),

                Infolists\Components\Section::make('Produtos')
                    ->schema([
                        Infolists\Components\RepeatableEntry::make('products')
                            ->schema([
                                Infolists\Components\TextEntry::make('name')->label('Produto'),
                                Infolists\Components\TextEntry::make('model')->label('Modelo'),
                                Infolists\Components\TextEntry::make('quantity')->label('Qtd'),
                                Infolists\Components\TextEntry::make('price')->label('Preço')->money('EUR'),
                                Infolists\Components\TextEntry::make('total')->label('Total')->money('EUR'),
                            ])
                            ->columns(5),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('order_id')->label('ID')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('firstname')->label('Cliente')
                    ->formatStateUsing(fn ($record) => $record->firstname . ' ' . $record->lastname)
                    ->searchable(['firstname', 'lastname']),
                Tables\Columns\TextColumn::make('status.name')
                    ->label('Estado')
                    ->badge()
                    ->color(fn (string $state): string => match (true) {
                        str_contains(strtolower($state), 'pend') => 'gray',
                        str_contains(strtolower($state), 'process') => 'warning',
                        str_contains(strtolower($state), 'envi') => 'info', // Enviado
                        str_contains(strtolower($state), 'ship') => 'info', // Shipped
                        str_contains(strtolower($state), 'complet') => 'success',
                        str_contains(strtolower($state), 'cancel') => 'danger',
                        str_contains(strtolower($state), 'refund') => 'danger', // Devolvido/Reembolsado
                        default => 'primary',
                    }),
                Tables\Columns\TextColumn::make('total')->label('Total')->money('EUR')->sortable(),
                Tables\Columns\TextColumn::make('date_added')->label('Data')->dateTime()->sortable(),
            ])
            ->defaultSort('order_id', 'desc')
            ->filters([
                Tables\Filters\Filter::make('order_id_filter')
                    ->form([
                        Forms\Components\TextInput::make('order_id')->label('ID do Pedido'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query->when(
                            $data['order_id'],
                            fn (Builder $query, $id): Builder => $query->where('order_id', $id),
                        );
                    }),
                
                Tables\Filters\SelectFilter::make('order_status_id')
                    ->label('Situação')
                    ->options(BlissOrderStatus::where('language_id', 1)->pluck('name', 'order_status_id')),

                Tables\Filters\Filter::make('customer_filter')
                    ->form([
                        Forms\Components\TextInput::make('customer_name')->label('Nome do Cliente'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query->when(
                            $data['customer_name'],
                            fn (Builder $query, $name): Builder => $query->where(function($q) use ($name) {
                                $q->where('firstname', 'like', "%{$name}%")
                                  ->orWhere('lastname', 'like', "%{$name}%");
                            }),
                        );
                    }),

                Tables\Filters\Filter::make('date_added')
                    ->form([
                        Forms\Components\DatePicker::make('date_added_from')->label('Adicionado de'),
                        Forms\Components\DatePicker::make('date_added_until')->label('Adicionado até'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['date_added_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('date_added', '>=', $date),
                            )
                            ->when(
                                $data['date_added_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('date_added', '<=', $date),
                            );
                    }),

                Tables\Filters\Filter::make('date_modified')
                    ->form([
                        Forms\Components\DatePicker::make('date_modified_from')->label('Modificado de'),
                        Forms\Components\DatePicker::make('date_modified_until')->label('Modificado até'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['date_modified_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('date_modified', '>=', $date),
                            )
                            ->when(
                                $data['date_modified_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('date_modified', '<=', $date),
                            );
                    }),
            ])
            ->actions([Tables\Actions\ViewAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBlissOrders::route('/'),
            'view' => Pages\ViewBlissOrder::route('/{record}'),
        ];
    }
}