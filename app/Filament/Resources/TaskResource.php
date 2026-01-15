<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TaskResource\Pages;
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
use Illuminate\Database\Eloquent\Builder;

class TaskResource extends Resource
{
    protected static ?string $model = Task::class;

    protected static ?string $navigationIcon = 'heroicon-o-clipboard-document-list';
    
    protected static ?string $navigationLabel = 'Minhas Tarefas';
    
    protected static ?string $modelLabel = 'Tarefa';
    
    protected static ?string $pluralModelLabel = 'Tarefas';
    
    protected static ?string $navigationGroup = 'Pessoal';
    
    protected static ?int $navigationSort = 1;

    public static function getEloquentQuery(): Builder
    {
        $user = Auth::user();
        return parent::getEloquentQuery()
            ->where(function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    $q->where('taskable_type', get_class($user))
                          ->where('taskable_id', $user->id);
                })
                ->orWhereHas('sharedWith', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            });
    }

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
                        
                        Forms\Components\RichEditor::make('description')
                            ->label('Descrição'),
                        
                        Forms\Components\FileUpload::make('attachments')
                            ->label('Anexos (PDF)')
                            ->acceptedFileTypes(['application/pdf'])
                            ->directory('tasks/attachments')
                            ->multiple()
                            ->preserveFilenames(),
                        
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
                            ->label('Notas')
                            ->columnSpanFull(),

                        Forms\Components\FileUpload::make('attachments')
                            ->label('Anexos (PDF)')
                            ->acceptedFileTypes(['application/pdf'])
                            ->multiple()
                            ->directory('tasks/attachments')
                            ->downloadable()
                            ->openable()
                            ->columnSpanFull(),
                        
                        Forms\Components\Toggle::make('is_private')
                            ->label('Tarefa Privada')
                            ->default(true)
                            ->helperText('Tarefas privadas são visíveis apenas para você'),

                        Forms\Components\Select::make('sharedWith')
                            ->label('Partilhar com')
                            ->relationship('sharedWith', 'name')
                            ->multiple()
                            ->preload()
                            ->searchable()
                            ->columnSpanFull(),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable()
                    ->weight('bold')
                    ->description(fn (Task $record) => ($record->taskable_id !== auth()->id() || $record->taskable_type !== get_class(auth()->user())) && $record->taskable ? 'Partilhado por ' . $record->taskable->name : null),
                
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
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('complete')
                    ->label('Concluir')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->action(fn (Task $record) => $record->markAsCompleted())
                    ->visible(fn (Task $record) => $record->status !== 'completed'),
                Tables\Actions\DeleteAction::make()
                    ->visible(fn (Task $record) => $record->taskable_id === auth()->id() && $record->taskable_type === get_class(auth()->user())),
                Tables\Actions\Action::make('leave')
                    ->label('Remover')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->requiresConfirmation()
                    ->modalHeading('Remover tarefa compartilhada')
                    ->modalDescription('Tem certeza que deseja remover esta tarefa da sua lista? Você perderá o acesso a ela.')
                    ->action(function (Task $record) {
                        $record->sharedWith()->detach(auth()->id());
                        \Filament\Notifications\Notification::make()
                            ->title('Tarefa removida da sua lista')
                            ->success()
                            ->send();
                    })
                    ->visible(fn (Task $record) => !($record->taskable_id === auth()->id() && $record->taskable_type === get_class(auth()->user()))),
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
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('due_date', 'asc');
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