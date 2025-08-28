<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TimesheetResource\Pages;
use App\Models\Timesheet;
use App\Models\Employee;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\Eloquent\Model;

class TimesheetResource extends Resource
{
    protected static ?string $model = Timesheet::class;

    protected static ?string $navigationIcon = 'heroicon-o-clock';
    
    protected static ?string $navigationLabel = 'Marcação de Ponto';
    
    protected static ?string $modelLabel = 'Ponto';
    
    protected static ?string $pluralModelLabel = 'Pontos';
    
    protected static ?string $navigationGroup = 'Recursos Humanos';
    
    protected static ?int $navigationSort = 3;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações do Ponto')
                    ->schema([
                        Forms\Components\Select::make('employee_id')
                            ->label('Funcionário')
                            ->relationship('employee', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        
                        Forms\Components\Select::make('company_id')
                            ->label('Empresa')
                            ->relationship('company', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        
                        Forms\Components\DatePicker::make('work_date')
                            ->label('Data')
                            ->required()
                            ->default(now()),
                    ])->columns(3),
                
                Forms\Components\Section::make('Horários de Trabalho')
                    ->schema([
                        Forms\Components\TimePicker::make('clock_in')
                            ->label('Entrada')
                            ->seconds(false)
                            ->required(),
                        
                        Forms\Components\TimePicker::make('clock_out')
                            ->label('Saída')
                            ->seconds(false),
                        
                        Forms\Components\TimePicker::make('lunch_start')
                            ->label('Início do Almoço')
                            ->seconds(false),
                        
                        Forms\Components\TimePicker::make('lunch_end')
                            ->label('Fim do Almoço')
                            ->seconds(false),
                    ])->columns(4),
                
                Forms\Components\Section::make('Horas Trabalhadas')
                    ->schema([
                        Forms\Components\TextInput::make('total_hours')
                            ->label('Total de Horas')
                            ->numeric()
                            ->step(0.25)
                            ->suffix('horas')
                            ->readOnly(),
                        
                        Forms\Components\TextInput::make('overtime_hours')
                            ->label('Horas Extras')
                            ->numeric()
                            ->step(0.25)
                            ->suffix('horas')
                            ->default(0)
                            ->readOnly(),
                    ])->columns(2),
                
                Forms\Components\Section::make('Status e Localização')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'present' => 'Presente',
                                'absent' => 'Ausente',
                                'late' => 'Atrasado',
                                'early_leave' => 'Saída Antecipada',
                                'holiday' => 'Feriado',
                                'sick_leave' => 'Licença Médica',
                                'vacation' => 'Férias',
                            ])
                            ->default('present')
                            ->required(),
                        
                        Forms\Components\TextInput::make('ip_address')
                            ->label('Endereço IP')
                            ->placeholder('Preenchido automaticamente'),
                        
                        Forms\Components\TextInput::make('location')
                            ->label('Localização')
                            ->placeholder('Ex: Escritório, Home Office, Cliente'),
                    ])->columns(3),
                
                Forms\Components\Section::make('Aprovação')
                    ->schema([
                        Forms\Components\Select::make('approved_by')
                            ->label('Aprovado por')
                            ->relationship('approvedBy', 'name')
                            ->searchable()
                            ->preload(),
                        
                        Forms\Components\DateTimePicker::make('approved_at')
                            ->label('Data de Aprovação'),
                    ])->columns(2),
                
                Forms\Components\Section::make('Observações')
                    ->schema([
                        Forms\Components\Textarea::make('employee_notes')
                            ->label('Observações do Funcionário')
                            ->rows(3),
                        Forms\Components\Textarea::make('manager_notes')
                            ->label('Observações do Gestor')
                            ->rows(3),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('employee.name')
                    ->label('Funcionário')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('company.name')
                    ->label('Empresa')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('work_date')
                    ->label('Data')
                    ->date('d/m/Y')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('clock_in')
                    ->label('Entrada')
                    ->time('H:i')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('clock_out')
                    ->label('Saída')
                    ->time('H:i')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('total_hours')
                    ->label('Total')
                    ->suffix('h')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('overtime_hours')
                    ->label('Extras')
                    ->suffix('h')
                    ->sortable(),
                
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'present' => 'Presente',
                        'absent' => 'Ausente',
                        'late' => 'Atrasado',
                        'early_leave' => 'Saída Antecipada',
                        'holiday' => 'Feriado',
                        'sick_leave' => 'Licença Médica',
                        'vacation' => 'Férias',
                        default => $state,
                    })
                    ->colors([
                        'success' => 'present',
                        'danger' => 'absent',
                        'warning' => ['late', 'early_leave'],
                        'info' => ['holiday', 'vacation'],
                        'secondary' => 'sick_leave',
                    ])
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Registrado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('employee_id')
                    ->label('Funcionário')
                    ->relationship('employee', 'name')
                    ->searchable()
                    ->preload(),
                
                Tables\Filters\SelectFilter::make('company_id')
                    ->label('Empresa')
                    ->relationship('company', 'name')
                    ->searchable()
                    ->preload(),
                
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'present' => 'Presente',
                        'absent' => 'Ausente',
                        'late' => 'Atrasado',
                        'early_leave' => 'Saída Antecipada',
                        'holiday' => 'Feriado',
                        'sick_leave' => 'Licença Médica',
                        'vacation' => 'Férias',
                    ]),
                
                Tables\Filters\Filter::make('work_date')
                    ->form([
                        Forms\Components\DatePicker::make('from')
                            ->label('De'),
                        Forms\Components\DatePicker::make('until')
                            ->label('Até'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('work_date', '>=', $date),
                            )
                            ->when(
                                $data['until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('work_date', '<=', $date),
                            );
                    })
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('approve')
                    ->label('Aprovar')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => is_null($record->approved_by))
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'approved_by' => auth()->id(),
                            'approved_at' => now(),
                        ]);
                    }),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('work_date', 'desc');
    }
    
    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Informações do Ponto')
                    ->schema([
                        TextEntry::make('employee.name')
                            ->label('Funcionário'),
                        TextEntry::make('company.name')
                            ->label('Empresa'),
                        TextEntry::make('date')
                            ->label('Data')
                            ->date('d/m/Y'),
                    ])->columns(3),
                
                Section::make('Horários de Trabalho')
                    ->schema([
                        TextEntry::make('clock_in')
                            ->label('Entrada')
                            ->time('H:i'),
                        TextEntry::make('clock_out')
                            ->label('Saída')
                            ->time('H:i'),
                        TextEntry::make('lunch_start')
                            ->label('Início do Almoço')
                            ->time('H:i'),
                        TextEntry::make('lunch_end')
                            ->label('Fim do Almoço')
                            ->time('H:i'),
                    ])->columns(4),
                
                Section::make('Horas Trabalhadas')
                    ->schema([
                        TextEntry::make('total_hours')
                            ->label('Total de Horas')
                            ->suffix(' horas'),
                        TextEntry::make('overtime_hours')
                            ->label('Horas Extras')
                            ->suffix(' horas'),
                    ])->columns(2),
                
                Section::make('Status e Localização')
                    ->schema([
                        TextEntry::make('status')
                            ->label('Status')
                            ->formatStateUsing(fn (string $state): string => match ($state) {
                                'present' => 'Presente',
                                'absent' => 'Ausente',
                                'late' => 'Atrasado',
                                'early_leave' => 'Saída Antecipada',
                                'holiday' => 'Feriado',
                                'sick_leave' => 'Licença Médica',
                                'vacation' => 'Férias',
                                default => $state,
                            })
                            ->badge()
                            ->color(fn (string $state): string => match ($state) {
                                'present' => 'success',
                                'absent' => 'danger',
                                'late', 'early_leave' => 'warning',
                                'holiday', 'vacation' => 'info',
                                'sick_leave' => 'secondary',
                                default => 'secondary',
                            }),
                        TextEntry::make('ip_address')
                            ->label('Endereço IP'),
                        TextEntry::make('location')
                            ->label('Localização'),
                    ])->columns(3),
                
                Section::make('Aprovação')
                    ->schema([
                        TextEntry::make('approvedBy.name')
                            ->label('Aprovado por')
                            ->placeholder('Não aprovado'),
                        TextEntry::make('approved_at')
                            ->label('Data de Aprovação')
                            ->dateTime('d/m/Y H:i')
                            ->placeholder('Não aprovado'),
                    ])->columns(2),
                
                Section::make('Observações')
                    ->schema([
                        TextEntry::make('notes')
                            ->label('Observações')
                            ->placeholder('Nenhuma observação'),
                    ])
                    ->visible(fn ($record) => !empty($record->notes)),
                
                Section::make('Auditoria')
                    ->schema([
                        TextEntry::make('created_at')
                            ->label('Registrado em')
                            ->dateTime('d/m/Y H:i'),
                        TextEntry::make('updated_at')
                            ->label('Atualizado em')
                            ->dateTime('d/m/Y H:i'),
                    ])->columns(2),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTimesheets::route('/'),
            'create' => Pages\CreateTimesheet::route('/create'),
            'view' => Pages\ViewTimesheet::route('/{record}'),
            'edit' => Pages\EditTimesheet::route('/{record}/edit'),
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->user()->can('viewAny', Timesheet::class);
    }

    public static function canViewAny(): bool
    {
        return auth()->user()->can('viewAny', Timesheet::class);
    }

    public static function canCreate(): bool
    {
        return auth()->user()->can('create', Timesheet::class);
    }

    public static function canEdit(Model $record): bool
    {
        return auth()->user()->can('update', $record);
    }

    public static function canDelete(Model $record): bool
    {
        return auth()->user()->can('delete', $record);
    }

    public static function canDeleteAny(): bool
    {
        return auth()->user()->can('viewAny', Timesheet::class);
    }
}