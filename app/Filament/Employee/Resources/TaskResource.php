<?php

namespace App\Filament\Employee\Resources;

use App\Filament\Employee\Resources\TaskResource\Pages;
use App\Models\Task;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Forms\Components\Section;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Actions\BulkAction;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Auth;

class TaskResource extends Resource
{
    protected static ?string $model = Task::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';
    
    protected static ?string $navigationLabel = 'Tarefas e Anotações';
    
    protected static ?string $modelLabel = 'Tarefa';
    
    protected static ?string $pluralModelLabel = 'Tarefas e Anotações';
    
    protected static ?string $navigationGroup = 'Pessoal';
    
    protected static ?int $navigationSort = 1;
    
    protected static ?string $navigationBadge = 'minhas tarefas';
    
    protected static ?string $navigationActiveBadge = 'ativas';

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Informações da Tarefa')
                    ->schema([
                        Forms\Components\TextInput::make('title')
                            ->label('Título')
                            ->required()
                            ->maxLength(255),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Descrição')
                            ->rows(3),
                        
                        Forms\Components\Select::make('priority')
                            ->label('Prioridade')
                            ->options([
                                'low' => 'Baixa',
                                'medium' => 'Média',
                                'high' => 'Alta',
                                'urgent' => 'Urgente',
                            ])
                            ->default('medium')
                            ->required(),
                        
                        Forms\Components\Select::make('status')
                            ->label('Estado')
                            ->options([
                                'pending' => 'Pendente',
                                'in_progress' => 'Em Progresso',
                                'completed' => 'Concluída',
                                'cancelled' => 'Cancelada',
                            ])
                            ->default('pending')
                            ->required(),
                    ])
                    ->columns(2),
                
                Section::make('Agendamento')
                    ->schema([
                        Forms\Components\DateTimePicker::make('start_date')
                            ->label('Data/Hora de Início')
                            ->seconds(false),
                        
                        Forms\Components\DateTimePicker::make('due_date')
                            ->label('Data/Hora de Vencimento')
                            ->seconds(false),
                        
                        Forms\Components\Toggle::make('is_all_day')
                            ->label('Dia Inteiro')
                            ->default(false),
                        
                        Forms\Components\TextInput::make('location')
                            ->label('Local')
                            ->maxLength(255),
                    ])
                    ->columns(2),
                
                Section::make('Detalhes Adicionais')
                    ->schema([
                        Forms\Components\RichEditor::make('notes')
                            ->label('Notas e Anotações')
                            ->helperText('Adicione anotações detalhadas, checklists ou comentários')
                            ->toolbarButtons([
                                'bold', 'italic', 'underline', 'strike',
                                'bulletList', 'orderedList', 'link',
                                'undo', 'redo'
                            ])
                            ->columnSpanFull(),
                        
                        Forms\Components\TagsInput::make('tags')
                            ->label('Tags/Categorias')
                            ->helperText('Organize suas tarefas com tags')
                            ->placeholder('Adicione tags...'),
                        
                        Forms\Components\Toggle::make('is_private')
                            ->label('Tarefa Privada')
                            ->default(true)
                            ->helperText('Tarefas privadas são visíveis apenas para você'),
                        
                        Forms\Components\Toggle::make('is_important')
                            ->label('Tarefa Importante')
                            ->default(false)
                            ->helperText('Marque tarefas importantes para destaque visual'),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(function ($query) {
                // Filtrar apenas tarefas do utilizador atual
                $user = Auth::user();
                return $query->where('taskable_type', get_class($user))
                           ->where('taskable_id', $user->id);
            })
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->description(fn (Task $record) => 
                        $record->description ? 
                        (strlen($record->description) > 50 ? 
                            substr($record->description, 0, 50) . '...' : 
                            $record->description) : 
                        null
                    )
                    ->icon(fn (Task $record) => $record->is_important ? 'heroicon-s-star' : null)
                    ->iconColor(fn (Task $record) => $record->is_important ? 'warning' : null),
                
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
                
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Estado')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending' => 'Pendente',
                        'in_progress' => 'Em Progresso',
                        'completed' => 'Concluída',
                        'cancelled' => 'Cancelada',
                    })
                    ->colors([
                        'warning' => 'pending',
                        'info' => 'in_progress',
                        'success' => 'completed',
                        'gray' => 'cancelled',
                    ]),
                
                Tables\Columns\BadgeColumn::make('tags')
                    ->label('Tags')
                    ->formatStateUsing(fn (array $state): string => count($state) . ' tags')
                    ->color('info')
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('due_date')
                    ->label('Vencimento')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->color(fn ($record) => $record->isOverdue() ? 'danger' : null),
                
                Tables\Columns\TextColumn::make('location')
                    ->label('Local')
                    ->limit(30)
                    ->toggleable(isToggledHiddenByDefault: true),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criada em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Estado')
                    ->options([
                        'pending' => 'Pendente',
                        'in_progress' => 'Em Progresso',
                        'completed' => 'Concluída',
                        'cancelled' => 'Cancelada',
                    ]),
                
                SelectFilter::make('priority')
                    ->label('Prioridade')
                    ->options([
                        'low' => 'Baixa',
                        'medium' => 'Média',
                        'high' => 'Alta',
                        'urgent' => 'Urgente',
                    ]),
                
                Tables\Filters\Filter::make('overdue')
                    ->label('Em Atraso')
                    ->query(fn ($query) => $query->overdue()),
                
                Tables\Filters\Filter::make('today')
                    ->label('Hoje')
                    ->query(fn ($query) => $query->today()),
                
                Tables\Filters\Filter::make('this_week')
                    ->label('Esta Semana')
                    ->query(fn ($query) => $query->thisWeek()),
                
                Tables\Filters\Filter::make('important')
                    ->label('Importantes')
                    ->query(fn ($query) => $query->where('is_important', true)),
                
                Tables\Filters\Filter::make('private')
                    ->label('Privadas')
                    ->query(fn ($query) => $query->where('is_private', true)),
                
                Tables\Filters\Filter::make('with_notes')
                    ->label('Com Anotações')
                    ->query(fn ($query) => $query->whereNotNull('notes')->where('notes', '!=', '')),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('complete')
                    ->label('Concluir')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->action(fn (Task $record) => $record->markAsCompleted())
                    ->visible(fn (Task $record) => $record->status !== 'completed'),
                
                Tables\Actions\Action::make('duplicate')
                    ->label('Duplicar')
                    ->icon('heroicon-o-document-duplicate')
                    ->color('info')
                    ->action(function (Task $record) {
                        $newTask = $record->replicate();
                        $newTask->title = $record->title . ' (Cópia)';
                        $newTask->status = 'pending';
                        $newTask->save();
                    })
                    ->requiresConfirmation(),
                
                Tables\Actions\Action::make('toggle_important')
                    ->label(fn (Task $record) => $record->is_important ? 'Remover Importante' : 'Marcar Importante')
                    ->icon(fn (Task $record) => $record->is_important ? 'heroicon-o-star' : 'heroicon-s-star')
                    ->color(fn (Task $record) => $record->is_important ? 'gray' : 'warning')
                    ->action(fn (Task $record) => $record->update(['is_important' => !$record->is_important])),
                
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    BulkAction::make('mark_completed')
                        ->label('Marcar como Concluídas')
                        ->icon('heroicon-o-check')
                        ->color('success')
                        ->action(function (Collection $records) {
                            $records->each(fn (Task $record) => $record->markAsCompleted());
                        }),
                    
                    BulkAction::make('mark_important')
                        ->label('Marcar como Importantes')
                        ->icon('heroicon-s-star')
                        ->color('warning')
                        ->action(function (Collection $records) {
                            $records->each(fn (Task $record) => $record->update(['is_important' => true]));
                        }),
                    
                    BulkAction::make('mark_not_important')
                        ->label('Remover Importância')
                        ->icon('heroicon-o-star')
                        ->color('gray')
                        ->action(function (Collection $records) {
                            $records->each(fn (Task $record) => $record->update(['is_important' => false]));
                        }),
                    
                    BulkAction::make('duplicate_tasks')
                        ->label('Duplicar Selecionadas')
                        ->icon('heroicon-o-document-duplicate')
                        ->color('info')
                        ->action(function (Collection $records) {
                            $records->each(function (Task $record) {
                                $newTask = $record->replicate();
                                $newTask->title = $record->title . ' (Cópia)';
                                $newTask->status = 'pending';
                                $newTask->save();
                            });
                        })
                        ->requiresConfirmation(),
                    
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('due_date', 'asc');
    }
    
    public static function getNavigationBadge(): ?string
    {
        $user = Auth::user();
        $count = Task::where('taskable_type', get_class($user))
            ->where('taskable_id', $user->id)
            ->where('status', '!=', 'completed')
            ->count();
        
        return $count > 0 ? (string) $count : null;
    }
    
    public static function getNavigationBadgeColor(): ?string
    {
        $user = Auth::user();
        $count = Task::where('taskable_type', get_class($user))
            ->where('taskable_id', $user->id)
            ->where('status', '!=', 'completed')
            ->count();
        
        if ($count === 0) return null;
        
        $urgentCount = Task::where('taskable_type', get_class($user))
            ->where('taskable_id', $user->id)
            ->where('status', '!=', 'completed')
            ->where('priority', 'urgent')
            ->count();
        
        return $urgentCount > 0 ? 'danger' : 'warning';
    }
    
    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTasks::route('/'),
            'create' => Pages\CreateTask::route('/create'),
            'edit' => Pages\EditTask::route('/{record}/edit'),
        ];
    }
}