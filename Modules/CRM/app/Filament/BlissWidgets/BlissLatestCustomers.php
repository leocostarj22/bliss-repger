<?php

namespace Modules\CRM\Filament\BlissWidgets;

use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Modules\CRM\Filament\Resources\BlissCustomerResource;
use Modules\CRM\Models\BlissCustomer;

class BlissLatestCustomers extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?string $heading = 'Novos Clientes (Atividades Recentes)';
    protected static ?int $sort = 3;

    public function table(Table $table): Table
    {
        return $table
            ->query(BlissCustomer::query()->latest('date_added')->limit(5))
            ->columns([
                Tables\Columns\TextColumn::make('firstname')->label('Nome')
                    ->formatStateUsing(fn ($record) => $record->firstname . ' ' . $record->lastname),
                Tables\Columns\TextColumn::make('email')->label('Email'),
                Tables\Columns\TextColumn::make('telephone')->label('Telefone'),
                Tables\Columns\TextColumn::make('date_added')->label('Registrado em')->dateTime(),
            ])
            ->actions([
                Tables\Actions\Action::make('edit')
                    ->label('Editar')
                    ->url(fn (BlissCustomer $record): string => BlissCustomerResource::getUrl('edit', ['record' => $record])),
            ]);
    }
}