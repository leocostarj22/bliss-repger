<?php

namespace App\Filament\Employee\Pages;

use App\Models\Timesheet;
use Filament\Pages\Page;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Actions\CreateAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\TimePicker;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Illuminate\Database\Eloquent\Builder;
use Filament\Notifications\Notification;
use Carbon\Carbon;

class MyTimesheet extends Page implements HasTable
{
    use InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-clock';
    protected static string $view = 'filament.employee.pages.my-timesheet';
    protected static ?string $navigationLabel = 'Meu Ponto';
    protected static ?string $title = 'Controle de Ponto';
    protected static ?int $navigationSort = 3;
    protected static ?string $navigationGroup = 'Pessoal';

    public function table(Table $table): Table
    {
        return $table
            ->query($this->getTableQuery())
            ->columns([
                TextColumn::make('work_date')
                    ->label('Data')
                    ->date('d/m/Y')
                    ->sortable(),
                TextColumn::make('clock_in')
                    ->label('Entrada')
                    ->time('H:i'),
                TextColumn::make('lunch_start')
                    ->label('Início Almoço')
                    ->time('H:i'),
                TextColumn::make('lunch_end')
                    ->label('Fim Almoço')
                    ->time('H:i'),
                TextColumn::make('clock_out')
                    ->label('Saída')
                    ->time('H:i'),
                TextColumn::make('lunch_hours')
                    ->label('Almoço (h)')
                    ->numeric(2)
                    ->suffix('h'),
                TextColumn::make('total_hours')
                    ->label('Horas Trabalhadas')
                    ->numeric(2)
                    ->suffix('h'),
                TextColumn::make('overtime_hours')
                    ->label('Horas Extras')
                    ->numeric(2)
                    ->suffix('h'),
                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'success' => 'present',
                        'danger' => 'absent',
                        'warning' => ['late', 'early_leave'],
                        'info' => ['holiday', 'vacation'],
                        'secondary' => 'sick_leave',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'present' => 'Presente',
                        'absent' => 'Ausente',
                        'late' => 'Atrasado',
                        'early_leave' => 'Saída Antecipada',
                        'holiday' => 'Feriado',
                        'sick_leave' => 'Licença Médica',
                        'vacation' => 'Férias',
                        default => $state,
                    }),
            ])
            ->headerActions([
                CreateAction::make()
                    ->label('Registrar Ponto')
                    ->form([
                        DatePicker::make('work_date')
                            ->label('Data')
                            ->default(now())
                            ->required(),
                        TimePicker::make('clock_in')
                            ->label('Horário de Entrada')
                            ->seconds(false)
                            ->required(),
                        TimePicker::make('lunch_start')
                            ->label('Início do Almoço')
                            ->seconds(false),
                        TimePicker::make('lunch_end')
                            ->label('Fim do Almoço')
                            ->seconds(false),
                        TimePicker::make('clock_out')
                            ->label('Horário de Saída')
                            ->seconds(false),
                        TextInput::make('location')
                            ->label('Local de Trabalho')
                            ->maxLength(255),
                        Textarea::make('employee_notes')
                            ->label('Observações')
                            ->rows(3),
                    ])
                    ->mutateFormDataUsing(function (array $data): array {
                        $employeeId = auth()->user()->employee_id;
                        $employee = auth()->user()->employee;
                        
                        $data['employee_id'] = $employeeId;
                        $data['company_id'] = $employee?->company_id ?? 1;
                        $data['status'] = 'present';
                        
                        // Calcular horas de almoço
                        if (isset($data['lunch_start']) && isset($data['lunch_end'])) {
                            $lunchStart = Carbon::parse($data['lunch_start']);
                            $lunchEnd = Carbon::parse($data['lunch_end']);
                            $data['lunch_hours'] = round($lunchEnd->diffInMinutes($lunchStart) / 60, 2);
                        }
                        
                        // Calcular horas trabalhadas
                        if (isset($data['clock_in']) && isset($data['clock_out'])) {
                            $clockIn = Carbon::parse($data['clock_in']);
                            $clockOut = Carbon::parse($data['clock_out']);
                            $totalMinutes = $clockOut->diffInMinutes($clockIn);
                            
                            // Subtrair tempo de almoço se definido
                            if (isset($data['lunch_hours'])) {
                                $totalMinutes -= ($data['lunch_hours'] * 60);
                            }
                            
                            $data['total_hours'] = round($totalMinutes / 60, 2);
                            $data['overtime_hours'] = max(0, $data['total_hours'] - 8);
                        }
                        
                        return $data;
                    })
                    ->successNotification(
                        Notification::make()
                            ->success()
                            ->title('Ponto registrado!')
                            ->body('Seu registro de ponto foi salvo com sucesso.')
                    ),
            ])
            ->defaultSort('work_date', 'desc');
    }

    protected function getTableQuery(): Builder
    {
        $employeeId = auth()->user()->employee_id;
        
        if (!$employeeId) {
            return Timesheet::query()->whereRaw('1 = 0');
        }

        return Timesheet::query()->where('employee_id', $employeeId);
    }
}