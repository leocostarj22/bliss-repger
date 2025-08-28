<?php

namespace App\Filament\Employee\Pages;

use App\Models\Vacation;
use Filament\Pages\Page;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Concerns\InteractsWithTable;
use Filament\Tables\Contracts\HasTable;
use Filament\Tables\Actions\CreateAction;
use Filament\Tables\Actions\ViewAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Form;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Illuminate\Database\Eloquent\Builder;
use Filament\Notifications\Notification;

class MyVacations extends Page implements HasTable
{
    use InteractsWithTable;

    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';
    protected static string $view = 'filament.employee.pages.my-vacations';
    protected static ?string $navigationLabel = 'Minhas Férias';
    protected static ?string $title = 'Minhas Férias';
    protected static ?int $navigationSort = 2;
    protected static ?string $navigationGroup = 'Pessoal';

    public function table(Table $table): Table
    {
        return $table
            ->query($this->getTableQuery())
            ->columns([
                TextColumn::make('vacation_type')
                    ->label('Tipo')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'annual_leave' => 'Férias Anuais',
                        'sick_leave' => 'Baixa Médica',
                        'maternity_leave' => 'Licença Maternidade',
                        'paternity_leave' => 'Licença Paternidade',
                        'marriage_leave' => 'Licença Casamento',
                        'bereavement_leave' => 'Licença por Luto',
                        'study_leave' => 'Licença para Estudos',
                        'unpaid_leave' => 'Licença Sem Vencimento',
                        'other' => 'Outro',
                        default => $state,
                    }),
                TextColumn::make('start_date')
                    ->label('Período')
                    ->formatStateUsing(fn ($record) => 
                        $record && $record->start_date && $record->end_date
                            ? $record->start_date->format('d/m/Y') . ' - ' . $record->end_date->format('d/m/Y')
                            : '—'
                    )
                    ->sortable(),
                TextColumn::make('requested_days')
                    ->label('Dias')
                    ->suffix(' dias')
                    ->numeric(),
                BadgeColumn::make('status')
                    ->label('Status')
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'approved',
                        'danger' => 'rejected',
                        'secondary' => 'cancelled',
                    ])
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending' => 'Pendente',
                        'approved' => 'Aprovado',
                        'rejected' => 'Rejeitado',
                        'cancelled' => 'Cancelado',
                        default => $state,
                    }),
                TextColumn::make('approvedBy.name')
                    ->label('Aprovado por')
                    ->placeholder('—')
                    ->visible(fn ($record) => $record && in_array($record->status ?? '', ['approved', 'rejected'])),
                TextColumn::make('approved_at')
                    ->label('Data Aprovação')
                    ->dateTime('d/m/Y H:i')
                    ->placeholder('—')
                    ->visible(fn ($record) => $record && in_array($record->status ?? '', ['approved', 'rejected'])),
                TextColumn::make('requested_at')
                    ->label('Solicitado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->headerActions([
                CreateAction::make()
                    ->label('Solicitar Férias')
                    ->form([
                        Select::make('vacation_type')
                            ->label('Tipo de Férias')
                            ->options([
                                'annual_leave' => 'Férias Anuais',
                                'sick_leave' => 'Baixa Médica',
                                'maternity_leave' => 'Licença Maternidade',
                                'paternity_leave' => 'Licença Paternidade',
                                'marriage_leave' => 'Licença Casamento',
                                'bereavement_leave' => 'Licença por Luto',
                                'study_leave' => 'Licença para Estudos',
                                'unpaid_leave' => 'Licença Sem Vencimento',
                                'other' => 'Outro',
                            ])
                            ->required(),
                        DatePicker::make('start_date')
                            ->label('Data de Início')
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                $this->calculateDays($state, $get('end_date'), $set);
                            }),
                        DatePicker::make('end_date')
                            ->label('Data de Fim')
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                $this->calculateDays($get('start_date'), $state, $set);
                            }),
                        TextInput::make('requested_days')
                            ->label('Dias Solicitados')
                            ->disabled()
                            ->numeric()
                            ->default(0),
                        Textarea::make('employee_notes')
                            ->label('Observações')
                            ->rows(3),
                    ])
                    ->mutateFormDataUsing(function (array $data): array {
                        // Calcular dias solicitados se não estiver definido
                        if (!isset($data['requested_days']) || $data['requested_days'] <= 0) {
                            $startDate = \Carbon\Carbon::parse($data['start_date']);
                            $endDate = \Carbon\Carbon::parse($data['end_date']);
                            $data['requested_days'] = max(1, $startDate->diffInDays($endDate) + 1);
                        }
                        
                        // Definir campos obrigatórios
                        $data['employee_id'] = auth()->user()->employee_id;
                        $data['company_id'] = auth()->user()->employee->company_id ?? 1;
                        $data['requested_at'] = now();
                        $data['vacation_year'] = \Carbon\Carbon::parse($data['start_date'])->year;
                        $data['status'] = 'pending';
                        
                        return $data;
                    })
                    ->successNotification(
                        Notification::make()
                            ->success()
                            ->title('Solicitação enviada!')
                            ->body('Sua solicitação de férias foi enviada para aprovação.')
                    ),
            ])
            ->actions([
                ViewAction::make()
                    ->label('Ver Detalhes')
                    ->infolist([
                        Section::make('Informações da Solicitação')
                            ->schema([
                                TextEntry::make('vacation_type')
                                    ->label('Tipo de Férias')
                                    ->formatStateUsing(fn (string $state): string => match ($state) {
                                        'annual_leave' => 'Férias Anuais',
                                        'sick_leave' => 'Baixa Médica',
                                        'maternity_leave' => 'Licença Maternidade',
                                        'paternity_leave' => 'Licença Paternidade',
                                        'marriage_leave' => 'Licença Casamento',
                                        'bereavement_leave' => 'Licença por Luto',
                                        'study_leave' => 'Licença para Estudos',
                                        'unpaid_leave' => 'Licença Sem Vencimento',
                                        'other' => 'Outro',
                                        default => $state,
                                    }),
                                TextEntry::make('start_date')
                                    ->label('Data de Início')
                                    ->date('d/m/Y'),
                                TextEntry::make('end_date')
                                    ->label('Data de Fim')
                                    ->date('d/m/Y'),
                                TextEntry::make('requested_days')
                                    ->label('Dias Solicitados')
                                    ->suffix(' dias'),
                            ])->columns(2),
                        
                        Section::make('Status da Solicitação')
                            ->schema([
                                TextEntry::make('status')
                                    ->label('Status')
                                    ->formatStateUsing(fn (string $state): string => match ($state) {
                                        'pending' => 'Pendente',
                                        'approved' => 'Aprovado',
                                        'rejected' => 'Rejeitado',
                                        'cancelled' => 'Cancelado',
                                        default => $state,
                                    })
                                    ->badge()
                                    ->color(fn (string $state): string => match ($state) {
                                        'pending' => 'warning',
                                        'approved' => 'success',
                                        'rejected' => 'danger',
                                        'cancelled' => 'secondary',
                                        default => 'secondary',
                                    }),
                                TextEntry::make('approvedBy.name')
                                    ->label('Aprovado por')
                                    ->placeholder('Aguardando aprovação')
                                    ->visible(fn ($record) => $record && in_array($record->status ?? '', ['approved', 'rejected'])),
                                TextEntry::make('approved_at')
                                    ->label('Data de Aprovação')
                                    ->dateTime('d/m/Y H:i')
                                    ->placeholder('Aguardando aprovação')
                                    ->visible(fn ($record) => $record && in_array($record->status ?? '', ['approved', 'rejected'])),
                            ])->columns(3),
                        
                        Section::make('Observações')
                            ->schema([
                                TextEntry::make('employee_notes')
                                    ->label('Suas Observações')
                                    ->placeholder('Nenhuma observação informada'),
                                TextEntry::make('rejection_reason')
                                    ->label('Motivo da Rejeição')
                                    ->visible(fn ($record) => $record && ($record->status ?? '') === 'rejected')
                                    ->placeholder('Nenhum motivo informado')
                                    ->color('danger'),
                                TextEntry::make('admin_notes')
                                    ->label('Observações do RH')
                                    ->placeholder('Nenhuma observação do RH'),
                            ]),
                        
                        Section::make('Histórico')
                            ->schema([
                                TextEntry::make('requested_at')
                                    ->label('Solicitado em')
                                    ->dateTime('d/m/Y H:i'),
                                TextEntry::make('updated_at')
                                    ->label('Última atualização')
                                    ->dateTime('d/m/Y H:i'),
                            ])->columns(2),
                    ])
                    ->modalHeading(fn ($record) => 'Detalhes da Solicitação de Férias')
                    ->modalWidth('4xl'),
            ])
            ->defaultSort('requested_at', 'desc')
            ->emptyStateHeading('Nenhuma solicitação de férias')
            ->emptyStateDescription('Você ainda não fez nenhuma solicitação de férias. Clique no botão acima para fazer sua primeira solicitação.')
            ->emptyStateIcon('heroicon-o-calendar-days');
    }

    protected function getTableQuery(): Builder
    {
        $employeeId = auth()->user()->employee_id;
        
        if (!$employeeId) {
            return Vacation::query()->whereRaw('1 = 0');
        }
    
        return Vacation::query()->where('employee_id', $employeeId);
    }

    private function calculateDays($startDate, $endDate, callable $set): void
    {
        if ($startDate && $endDate) {
            $start = \Carbon\Carbon::parse($startDate);
            $end = \Carbon\Carbon::parse($endDate);
            $days = $start->diffInDays($end) + 1;
            $set('requested_days', $days);
        }
    }
}