<?php

namespace App\Filament\Resources\TaskResource\Widgets;

use App\Models\Task;
use Filament\Widgets\Widget;
use Illuminate\Support\Facades\Auth;
use Illuminate\Database\Eloquent\Model;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
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
            ->where('taskable_type', get_class($user))
            ->where('taskable_id', $user->id)
            ->whereNotNull('due_date')
            ->get()
            ->map(function (Task $task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'start' => $task->due_date,
                    'end' => $task->due_date,
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
                
            DateTimePicker::make('due_date')
                ->label('Data de Vencimento')
                ->required(),
                
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
                ->label('Editar')
                ->mutateFormDataUsing(function (Task $record, array $data): array {
                    $user = Auth::user();
                    $data['taskable_type'] = get_class($user);
                    $data['taskable_id'] = $user->id;
                    return $data;
                }),
                
            DeleteAction::make()
                ->label('Excluir'),
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