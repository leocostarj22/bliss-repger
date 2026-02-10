<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Filament\Resources\BlissCustomerResource\Pages;
use Modules\CRM\Models\BlissCustomer;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

use Modules\CRM\Filament\Resources\BlissCustomerResource\RelationManagers;

class BlissCustomerResource extends Resource
{
    protected static ?string $model = BlissCustomer::class;
    protected static ?string $navigationIcon = 'heroicon-o-users';
    protected static ?string $navigationGroup = 'Bliss Natura';
    protected static ?string $navigationLabel = 'Clientes';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('firstname')->label('Nome')->required(),
            Forms\Components\TextInput::make('lastname')->label('Apelido')->required(),
            Forms\Components\TextInput::make('email')->email()->required(),
            Forms\Components\TextInput::make('telephone')->label('Telefone'),
            Forms\Components\Toggle::make('status')->label('Ativo'),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\TextColumn::make('firstname')->label('Nome')->searchable()->sortable(),
            Tables\Columns\TextColumn::make('lastname')->label('Apelido')->searchable()->sortable(),
            Tables\Columns\TextColumn::make('email')
                ->searchable()
                ->icon('heroicon-m-envelope')
                ->copyable()
                ->url(fn ($record) => "mailto:{$record->email}"),
            Tables\Columns\TextColumn::make('telephone')
                ->label('Telefone')
                ->icon('heroicon-m-phone')
                ->url(fn ($record) => "tel:{$record->telephone}"),
            Tables\Columns\TextColumn::make('status')
                ->label('Status')
                ->badge()
                ->color(fn (bool $state): string => $state ? 'success' : 'danger')
                ->formatStateUsing(fn (bool $state): string => $state ? 'Ativo' : 'Inativo'),
            Tables\Columns\TextColumn::make('date_added')->label('Data Registo')->dateTime()->sortable(),
        ])
        ->defaultSort('customer_id', 'desc')
        ->actions([Tables\Actions\EditAction::make()]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\OrdersRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListBlissCustomers::route('/'),
            'create' => Pages\CreateBlissCustomer::route('/create'),
            'edit' => Pages\EditBlissCustomer::route('/{record}/edit'),
        ];
    }
}