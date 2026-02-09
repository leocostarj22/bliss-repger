<?php

namespace Modules\CRM\Filament\BlissWidgets;

use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Modules\CRM\Filament\Resources\BlissOrderResource;
use Modules\CRM\Models\BlissOrder;

class BlissLatestOrders extends BaseWidget
{
    protected int | string | array $columnSpan = 'full';
    protected static ?string $heading = 'Últimos Pedidos';
    protected static ?int $sort = 2;

    public function table(Table $table): Table
    {
        return $table
            ->query(BlissOrder::query()->latest('date_added')->limit(5))
            ->columns([
                Tables\Columns\TextColumn::make('order_id')->label('ID'),
                Tables\Columns\TextColumn::make('firstname')->label('Cliente')
                    ->formatStateUsing(fn ($record) => $record->firstname . ' ' . $record->lastname),
                Tables\Columns\TextColumn::make('status.name')->label('Estado')->badge(),
                Tables\Columns\TextColumn::make('total')->label('Total')->money('EUR'),
                Tables\Columns\TextColumn::make('date_added')->label('Data')->dateTime(),
            ])
            ->actions([
                Tables\Actions\Action::make('view')
                    ->label('Ver')
                    ->url(fn (BlissOrder $record): string => BlissOrderResource::getUrl('view', ['record' => $record])),
            ]);
    }
}