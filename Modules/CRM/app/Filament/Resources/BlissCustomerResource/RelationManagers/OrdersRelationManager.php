<?php

namespace Modules\CRM\Filament\Resources\BlissCustomerResource\RelationManagers;

use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Filament\Resources\BlissOrderResource;

class OrdersRelationManager extends RelationManager
{
    protected static string $relationship = 'orders';
    protected static ?string $title = 'Pedidos';

    public function form(Form $form): Form
    {
        return $form->schema([
            // Apenas leitura, usamos os mesmos campos mas desabilitados ou simplificados
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
                Tables\Columns\TextColumn::make('date_added')->label('Data')->dateTime()->sortable(),
            ])
            ->defaultSort('order_id', 'desc')
            ->filters([
                //
            ])
            ->headerActions([
                // Não permitimos criar pedidos por aqui
            ])
            ->actions([
                Tables\Actions\ViewAction::make()->url(fn ($record) => BlissOrderResource::getUrl('view', ['record' => $record])),
            ])
            ->bulkActions([
                //
            ]);
    }
}