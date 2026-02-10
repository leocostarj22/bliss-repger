<?php

namespace Modules\CRM\Filament\Resources\MyFormulaCustomerResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Filament\Resources\MyFormulaOrderResource;

use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Infolist;

class OrdersRelationManager extends RelationManager
{
    protected static string $relationship = 'orders';
    protected static ?string $title = 'Pedidos';

    public function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                TextEntry::make('order_id')->label('ID'),
                TextEntry::make('status.name')->label('Situação'),
                TextEntry::make('total')->money('EUR')->label('Total'),
                TextEntry::make('date_added')->dateTime('d/m/Y H:i')->label('Data'),
                
                RepeatableEntry::make('products')
                    ->label('Itens do Pedido')
                    ->schema([
                        TextEntry::make('name')->label('Produto'),
                        TextEntry::make('model')->label('Modelo'),
                        TextEntry::make('quantity')->label('Qtd'),
                        TextEntry::make('total')->money('EUR')->label('Total'),
                    ])
                    ->columns(4)
                    ->columnSpanFull(),
            ]);
    }

    public function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('order_id')->label('ID')->disabled(),
            Forms\Components\TextInput::make('total')->label('Total')->disabled(),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->recordTitleAttribute('order_id')
            ->columns([
                Tables\Columns\TextColumn::make('order_id')->label('ID')->sortable(),
                Tables\Columns\TextColumn::make('status.name')
                    ->label('Estado')
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
                Tables\Columns\TextColumn::make('total')->label('Total')->money('EUR'),
                Tables\Columns\TextColumn::make('date_added')->label('Data')->dateTime('d/m/Y H:i')->sortable(),
            ])
            ->defaultSort('order_id', 'desc')
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->url(fn ($record) => MyFormulaOrderResource::getUrl('edit', ['record' => $record])),
            ]);
    }
}