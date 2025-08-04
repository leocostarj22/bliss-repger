<?php

namespace App\Filament\Employee\Widgets;

use App\Models\Task;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget as BaseWidget;
use Illuminate\Support\Facades\Auth;
use App\Filament\Employee\Resources\TaskResource;

class UpcomingTasksWidget extends BaseWidget
{
    protected static ?string $heading = 'Próximas Tarefas';
    
    protected int | string | array $columnSpan = 'full';
    
    protected static ?int $sort = 2;
    
    public function table(Table $table): Table
    {
        return $table
            ->query(
                Task::query()
                    ->where('taskable_type', get_class(Auth::user()))
                    ->where('taskable_id', Auth::user()->id)
                    ->whereNotIn('status', ['completed', 'cancelled'])
                    ->orderByRaw('due_date IS NULL, due_date ASC')
                    ->limit(10)
            )
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->weight('bold')
                    ->url(fn (Task $record): string => TaskResource::getUrl('edit', ['record' => $record])),
                    
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
            ])
            ->emptyStateHeading('Nenhuma tarefa pendente')
            ->emptyStateDescription('Você não possui tarefas pendentes no momento.')
            ->emptyStateIcon('heroicon-o-check-circle');
    }
}