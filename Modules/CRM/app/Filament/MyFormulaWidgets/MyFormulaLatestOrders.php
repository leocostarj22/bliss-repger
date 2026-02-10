<?php

namespace Modules\CRM\Filament\MyFormulaWidgets;

use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Modules\CRM\Filament\Resources\MyFormulaOrderResource;
use Modules\CRM\Models\MyFormulaOrder;

class MyFormulaLatestOrders extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?string $heading = 'Últimos Pedidos';
    protected static ?int $sort = 2;

    public function table(Table $table): Table
    {
        return $table
            ->query(MyFormulaOrder::query()->latest('date_added')->limit(5))
            ->columns([
                Tables\Columns\TextColumn::make('order_id')->label('ID'),
                Tables\Columns\TextColumn::make('firstname')->label('Cliente')
                    ->formatStateUsing(fn ($record) => $record->firstname . ' ' . $record->lastname),
                Tables\Columns\TextColumn::make('total')->label('Total')->money('EUR'),
                Tables\Columns\TextColumn::make('date_added')->label('Data')->dateTime(),
            ])
            ->actions([
                Tables\Actions\Action::make('edit')
                    ->label('Ver')
                    ->url(fn (MyFormulaOrder $record): string => MyFormulaOrderResource::getUrl('edit', ['record' => $record])),
            ]);
    }
}