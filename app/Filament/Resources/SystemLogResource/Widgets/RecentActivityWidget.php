<?php

namespace App\Filament\Resources\SystemLogResource\Widgets;

use App\Models\SystemLog;
use App\Filament\Resources\SystemLogResource;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;

class RecentActivityWidget extends BaseWidget
{
    protected static ?string $heading = 'Atividade Recente';
    protected static ?int $sort = 2;
    protected int | string | array $columnSpan = 'full';

    public function table(Table $table): Table
    {
        return $table
            ->query(
                SystemLog::query()
                    ->with('user')
                    ->latest()
                    ->limit(10)
            )
            ->columns([
                TextColumn::make('created_at')
                    ->label('Hora')
                    ->dateTime('H:i:s')
                    ->sortable(),
                    
                BadgeColumn::make('level')
                    ->label('Nível')
                    ->colors([
                        'success' => 'info',
                        'warning' => 'warning',
                        'danger' => 'error',
                        'gray' => 'critical',
                    ]),
                    
                TextColumn::make('action')
                    ->label('Ação')
                    ->badge(),
                    
                TextColumn::make('user.name')
                    ->label('Usuário')
                    ->formatStateUsing(fn ($state, $record) => $record->user?->name ?? 'Sistema'),
                    
                TextColumn::make('description')
                    ->label('Descrição')
                    ->limit(50),
            ])
            // Removido as actions que causavam o erro
            ->actions([]);
    }
}