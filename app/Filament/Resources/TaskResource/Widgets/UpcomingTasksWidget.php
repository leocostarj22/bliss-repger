<?php

namespace App\Filament\Resources\TaskResource\Widgets;

use App\Models\Task;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Auth;

class UpcomingTasksWidget extends BaseWidget
{
    protected static ?string $heading = 'Próximas Tarefas';
    
    protected int | string | array $columnSpan = 'full';
    
    public function table(Table $table): Table
    {
        return $table
            ->query(
                Task::query()
                    ->where('taskable_type', get_class(Auth::user()))
                    ->where('taskable_id', Auth::user()->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    // Remover esta linha: ->whereNotNull('due_date')
                    ->orderByRaw('due_date IS NULL, due_date ASC') // Tarefas com due_date primeiro
                    ->limit(10)
            )
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->weight('bold'),
                    
                Tables\Columns\BadgeColumn::make('priority')
                    ->label('Prioridade')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'low' => 'Baixa',
                        'medium' => 'Média',
                        'high' => 'Alta',
                        'urgent' => 'Urgente',
                    })
                    ->colors([
                        'success' => 'low',
                        'warning' => 'medium',
                        'danger' => ['high', 'urgent'],
                    ]),
                    
                Tables\Columns\TextColumn::make('due_date')
                    ->label('Vencimento')
                    ->dateTime('d/m/Y H:i')
                    ->color(fn ($record) => $record->isOverdue() ? 'danger' : null),
                    
                Tables\Columns\TextColumn::make('location')
                    ->label('Local')
                    ->limit(30),
            ])
            ->actions([
                Tables\Actions\Action::make('complete')
                    ->label('Concluir')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->action(fn (Task $record) => $record->markAsCompleted())
                    ->visible(fn (Task $record) => $record->status !== 'completed'),
            ]);
    }
}