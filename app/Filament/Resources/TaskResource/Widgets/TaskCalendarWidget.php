<?php

namespace App\Filament\Resources\TaskResource\Widgets;

use App\Models\Task;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
use Filament\Actions\Action;
use Saade\FilamentFullCalendar\Actions\CreateAction;
use Saade\FilamentFullCalendar\Actions\EditAction;
use Saade\FilamentFullCalendar\Actions\DeleteAction;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Toggle;

class TaskCalendarWidget extends FullCalendarWidget
{
    public Model | string | null $model = Task::class;

    protected static ?int $sort = 5; // Posicionar após os widgets existentes

    public function fetchEvents(array $fetchInfo): array
    {
        $user = Auth::user();
        
        return Task::query()
            ->where(function ($query) use ($user) {
                $query->where(function ($q) use ($user) {
                    $q->where('taskable_type', get_class($user))
                          ->where('taskable_id', $user->id);
                })
                ->orWhereHas('sharedWith', function ($q) use ($user) {
                    $q->where('users.id', $user->id);
                });
            })
            ->where(function ($query) {
                $query->whereNotNull('due_date')
                      ->orWhereNotNull('start_date');
            })
            ->get()
            ->map(function (Task $task) {
                // Use start_date if available, otherwise use due_date
                $startTime = $task->start_date ?? $task->due_date;
                $endTime = $task->due_date ?? $task->start_date;
                
                $eventData = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'backgroundColor' => $this->getTaskColor($task),
                    'borderColor' => $this->getTaskColor($task),
                    'textColor' => '#ffffff',
                    'extendedProps' => [
                        'description' => $task->description,
                        'priority' => $task->priority,
                        'status' => $task->status,
                        'location' => $task->location,
                    ],
                ];
                
                // Handle all-day events vs timed events
                if ($task->is_all_day) {
                    $eventData['start'] = $startTime->format('Y-m-d');
                    $eventData['end'] = $endTime->format('Y-m-d');
                    $eventData['allDay'] = true;
                } else {
                    $eventData['start'] = $startTime->format('Y-m-d\TH:i:s');
                    $eventData['end'] = $endTime->format('Y-m-d\TH:i:s');
                    $eventData['allDay'] = false;
                }
                
                return $eventData;
            })
            ->toArray();
    }

    public function onSelect(array $selectInfo): void
    {
        $this->createRecord([
            'due_date' => $selectInfo['start'], // preenche a data clicada
        ]);
    }

    public function dateClick(array $clickInfo): void
    {
        $this->createRecord([
            'due_date' => $clickInfo['date'],
        ]);
    }

    protected function getTaskColor(Task $task): string
    {
        // Cores baseadas no status
        if ($task->status === 'completed') {
            return '#10b981'; // Verde
        }
        
        if ($task->status === 'cancelled') {
            return '#6b7280'; // Cinza
        }
        
        // Cores baseadas na prioridade para tarefas pendentes
        return match ($task->priority) {
            'high' => '#ef4444',    // Vermelho
            'medium' => '#f59e0b',  // Amarelo
            'low' => '#3b82f6',     // Azul
            default => '#6366f1',   // Índigo
        };
    }

    public function getFormSchema(): array
    {
        return [
            TextInput::make('title')
                ->label('Título')
                ->required()
                ->maxLength(255),
                
            Textarea::make('description')
                ->label('Descrição')
                ->rows(3),
                
            Select::make('priority')
                ->label('Prioridade')
                ->options([
                    'low' => 'Baixa',
                    'medium' => 'Média',
                    'high' => 'Alta',
                ])
                ->default('medium')
                ->required(),
                
            Select::make('status')
                ->label('Status')
                ->options([
                    'pending' => 'Pendente',
                    'in_progress' => 'Em Progresso',
                    'completed' => 'Concluída',
                    'cancelled' => 'Cancelada',
                ])
                ->default('pending')
                ->required(),
                
            DateTimePicker::make('start_date')
                ->label('Data de Início')
                ->required(),
                
            DateTimePicker::make('due_date')
                ->label('Data de Vencimento')
                ->required(),
                
            Toggle::make('is_all_day')
                ->label('Evento de Dia Inteiro')
                ->default(false)
                ->reactive()
                ->afterStateUpdated(function ($state, callable $set) {
                    if ($state) {
                        // Se for dia inteiro, remove os horários
                        $set('start_date', now()->format('Y-m-d'));
                        $set('due_date', now()->format('Y-m-d'));
                    }
                }),
                
            TextInput::make('location')
                ->label('Local')
                ->maxLength(255),
                
            Toggle::make('is_recurring')
                ->label('Tarefa Recorrente')
                ->default(false),
        ];
    }

    protected function headerActions(): array
    {
        return [
            CreateAction::make()
                ->label('Nova Tarefa')
                ->mutateFormDataUsing(function (array $data): array {
                    $user = Auth::user();
                    $data['taskable_type'] = get_class($user);
                    $data['taskable_id'] = $user->id;
                    return $data;
                }),
        ];
    }

    protected function modalActions(): array
    {
        return [
            EditAction::make()
                ->label('Editar'),
                
            DeleteAction::make()
                ->label('Excluir')
                ->visible(fn (Task $record) => $record->taskable_id === auth()->id() && $record->taskable_type === get_class(auth()->user())),

            Action::make('leave')
                ->label('Remover')
                ->color('danger')
                ->requiresConfirmation()
                ->modalHeading('Remover tarefa compartilhada')
                ->modalDescription('Tem certeza que deseja remover esta tarefa da sua lista?')
                ->action(function (Task $record) {
                    $record->sharedWith()->detach(auth()->id());
                    \Filament\Notifications\Notification::make()
                        ->title('Tarefa removida da sua lista')
                        ->success()
                        ->send();
                })
                ->visible(fn (Task $record) => !($record->taskable_id === auth()->id() && $record->taskable_type === get_class(auth()->user()))),
        ];
    }

    public function config(): array
    {
        return [
            'firstDay' => 1, // Segunda-feira
            'headerToolbar' => [
                'left' => 'prev,next today',
                'center' => 'title',
                'right' => 'dayGridMonth,timeGridWeek,timeGridDay'
            ],
            'locale' => 'pt-br',
            'timeZone' => 'America/Sao_Paulo',
            'height' => 'auto',
            'navLinks' => true,
            'selectable' => true,
            'selectMirror' => true,
            'dayMaxEvents' => true,
            'weekends' => true,
            'slotMinTime' => '06:00:00',
            'slotMaxTime' => '22:00:00',
            'displayEventTime' => true,
            'displayEventEnd' => true,
        ];
    }

    public function eventDidMount(): string
    {
        return <<<JS
            function({ event, timeText, isStart, isEnd, isMirror, isPast, isFuture, isToday, el, view }){
                // Create tooltip content with task details
                let tooltipContent = event.title;
                
                if (event.extendedProps.description) {
                    tooltipContent += '\\n' + event.extendedProps.description;
                }
                
                if (event.extendedProps.priority) {
                    tooltipContent += '\\nPrioridade: ' + event.extendedProps.priority;
                }
                
                if (event.extendedProps.status) {
                    tooltipContent += '\\nStatus: ' + event.extendedProps.status;
                }
                
                if (event.extendedProps.location) {
                    tooltipContent += '\\nLocal: ' + event.extendedProps.location;
                }
                
                el.setAttribute("x-tooltip", "tooltip");
                el.setAttribute("x-data", "{ tooltip: '" + tooltipContent + "' }");
            }
        JS;
    }
}