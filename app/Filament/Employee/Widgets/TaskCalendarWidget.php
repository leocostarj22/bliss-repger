<?php

namespace App\Filament\Employee\Widgets;

use App\Models\Task;
use Saade\FilamentFullCalendar\Widgets\FullCalendarWidget;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use App\Filament\Employee\Resources\TaskResource;

class TaskCalendarWidget extends FullCalendarWidget
{
    public Model | string | null $model = Task::class;

    protected static ?int $sort = 3;
    
    protected int | string | array $columnSpan = 'full';

    public function fetchEvents(array $fetchInfo): array
    {
        $employeeUser = Auth::user();
        
        return Task::query()
            ->where('taskable_type', get_class($employeeUser))
            ->where('taskable_id', $employeeUser->id)
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

    protected function getTaskColor(Task $task): string
    {
        if ($task->isOverdue()) {
            return '#ef4444'; // red-500
        }

        return match ($task->priority) {
            'urgent' => '#dc2626', // red-600
            'high' => '#ea580c',   // orange-600
            'medium' => '#ca8a04', // yellow-600
            'low' => '#16a34a',    // green-600
            default => '#6b7280',  // gray-500
        };
    }

    public function onSelect(array $selectInfo): void
    {
        $this->createRecord([
            'due_date' => $selectInfo['start'],
        ]);
    }

    public function dateClick(array $clickInfo): void
    {
        $this->createRecord([
            'due_date' => $clickInfo['date'],
        ]);
    }

    public function eventClick(array $clickInfo): void
    {
        $this->editRecord($clickInfo['event']['id']);
    }

    protected function modalMaxWidth(): string
    {
        return '3xl';
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
            'timeZone' => 'Europe/Lisbon',
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