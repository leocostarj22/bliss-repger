<?php

namespace App\Filament\Resources;

use App\Filament\Resources\VacationResource\Pages;
use App\Models\Vacation;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Illuminate\Database\Eloquent\Model;


class VacationResource extends Resource
{
    protected static ?string $model = Vacation::class;

    protected static ?string $navigationIcon = 'heroicon-o-calendar-days';
    
    protected static ?string $navigationLabel = 'Férias';
    
    protected static ?string $modelLabel = 'Férias';
    
    protected static ?string $pluralModelLabel = 'Férias';
    
    protected static ?string $navigationGroup = 'Recursos Humanos';
    
    protected static ?int $navigationSort = 2;

    public static function shouldRegisterNavigation(): bool
    {
        $user = auth()->user();
        
        if (!$user) {
            return false;
        }
        
        // Administradores podem ver todos os recursos
        if ($user->isAdmin()) {
            return true;
        }
        
        // Gestores de RH podem ver recursos de RH
        if ($user->isManager() && 
            $user->department && 
            strtolower($user->department->name) === 'recursos humanos') {
            return true;
        }
        
        return false;
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações da Solicitação')
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
                        
                        Forms\Components\Select::make('vacation_type')
                            ->label('Tipo de Férias')
                            ->options([
                                'annual_leave' => 'Férias Anuais',
                                'maternity_leave' => 'Licença de Maternidade',
                                'paternity_leave' => 'Licença de Paternidade',
                                'sick_leave' => 'Baixa Médica',
                                'marriage_leave' => 'Licença de Casamento',
                                'bereavement_leave' => 'Licença por Luto',
                                'study_leave' => 'Licença para Estudos',
                                'unpaid_leave' => 'Licença Sem Vencimento',
                                'compensatory_leave' => 'Férias Compensatórias',
                                'advance_leave' => 'Adiantamento de Férias',
                                'other' => 'Outro',
                            ])
                            ->required(),
                    ])->columns(3),
                
                Forms\Components\Section::make('Período de Férias')
                    ->schema([
                        Forms\Components\DatePicker::make('start_date')
                            ->label('Data de Início')
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                $endDate = $get('end_date');
                                if ($state && $endDate) {
                                    $days = \Carbon\Carbon::parse($state)->diffInDays(\Carbon\Carbon::parse($endDate)) + 1;
                                    $set('requested_days', $days);
                                }
                            }),
                        
                        Forms\Components\DatePicker::make('end_date')
                            ->label('Data de Fim')
                            ->required()
                            ->reactive()
                            ->afterStateUpdated(function ($state, callable $set, callable $get) {
                                $startDate = $get('start_date');
                                if ($startDate && $state) {
                                    $days = \Carbon\Carbon::parse($startDate)->diffInDays(\Carbon\Carbon::parse($state)) + 1;
                                    $set('requested_days', $days);
                                }
                            }),
                        
                        Forms\Components\TextInput::make('requested_days')
                            ->label('Dias Solicitados')
                            ->numeric()
                            ->required()
                            ->readOnly(),
                    ])->columns(3),
                
                Forms\Components\Section::make('Status e Aprovação')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options([
                                'pending' => 'Pendente',
                                'approved' => 'Aprovado',
                                'rejected' => 'Rejeitado',
                                'cancelled' => 'Cancelado',
                            ])
                            ->default('pending')
                            ->required(),
                        
                        Forms\Components\Select::make('approved_by')
                            ->label('Aprovado por')
                            ->relationship('approvedBy', 'name')
                            ->searchable()
                            ->preload()
                            ->visible(fn (callable $get) => in_array($get('status'), ['approved', 'rejected'])),
                        
                        Forms\Components\DateTimePicker::make('approved_at')
                            ->label('Data de Aprovação')
                            ->visible(fn (callable $get) => in_array($get('status'), ['approved', 'rejected'])),
                    ])->columns(3),
                
                Forms\Components\Section::make('Observações')
                    ->schema([
                        Forms\Components\Textarea::make('employee_notes')
                            ->label('Observações do Funcionário')
                            ->disabled()
                            ->rows(3),
                        Forms\Components\Textarea::make('rejection_reason')
                            ->label('Motivo da Rejeição')
                            ->visible(fn (callable $get) => $get('status') === 'rejected')
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
                
                Tables\Columns\TextColumn::make('vacation_type')
                    ->label('Tipo')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'annual_leave' => 'Férias Anuais',
                        'maternity_leave' => 'Licença de Maternidade',
                        'paternity_leave' => 'Licença de Paternidade',
                        'sick_leave' => 'Baixa Médica',
                        'marriage_leave' => 'Licença de Casamento',
                        'bereavement_leave' => 'Licença por Luto',
                        'study_leave' => 'Licença para Estudos',
                        'unpaid_leave' => 'Licença Sem Vencimento',
                        'compensatory_leave' => 'Férias Compensatórias',
                        'advance_leave' => 'Adiantamento de Férias',
                        'other' => 'Outro',
                        // Manter compatibilidade com valores antigos
                        'annual' => 'Férias Anuais',
                        'compensatory' => 'Férias Compensatórias',
                        'advance' => 'Adiantamento de Férias',
                        default => $state,
                    })
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('start_date')
                    ->label('Período')
                    ->date('d/m/Y')
                    ->formatStateUsing(fn ($record) => 
                        $record->start_date->format('d/m/Y') . ' - ' . 
                        $record->end_date->format('d/m/Y')
                    )
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('requested_days')
                    ->label('Dias')
                    ->suffix(' dias')
                    ->sortable(),
                
                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'pending' => 'Pendente',
                        'approved' => 'Aprovado',
                        'rejected' => 'Rejeitado',
                        'cancelled' => 'Cancelado',
                        default => $state,
                    })
                    ->colors([
                        'warning' => 'pending',
                        'success' => 'approved',
                        'danger' => 'rejected',
                        'secondary' => 'cancelled',
                    ])
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Solicitado em')
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
                
                Tables\Filters\SelectFilter::make('vacation_type')
                    ->label('Tipo de Férias')
                    ->options([
                        'annual_leave' => 'Férias Anuais',
                        'maternity_leave' => 'Licença de Maternidade',
                        'paternity_leave' => 'Licença de Paternidade',
                        'sick_leave' => 'Baixa Médica',
                        'marriage_leave' => 'Licença de Casamento',
                        'bereavement_leave' => 'Licença por Luto',
                        'study_leave' => 'Licença para Estudos',
                        'unpaid_leave' => 'Licença Sem Vencimento',
                        'compensatory_leave' => 'Férias Compensatórias',
                        'advance_leave' => 'Adiantamento de Férias',
                        'other' => 'Outro',
                    ]),
                
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'pending' => 'Pendente',
                        'approved' => 'Aprovado',
                        'rejected' => 'Rejeitado',
                        'cancelled' => 'Cancelado',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\Action::make('approve')
                    ->label('Aprovar')
                    ->icon('heroicon-o-check')
                    ->color('success')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->requiresConfirmation()
                    ->action(function ($record) {
                        $record->update([
                            'status' => 'approved',
                            'approved_by' => auth()->id(),
                            'approved_at' => now(),
                        ]);
                    }),
                
                Tables\Actions\Action::make('reject')
                    ->label('Rejeitar')
                    ->icon('heroicon-o-x-mark')
                    ->color('danger')
                    ->visible(fn ($record) => $record->status === 'pending')
                    ->form([
                        Forms\Components\Textarea::make('rejection_reason')
                            ->label('Motivo da Rejeição')
                            ->required()
                            ->rows(3),
                    ])
                    ->action(function ($record, array $data) {
                        $record->update([
                            'status' => 'rejected',
                            'approved_by' => auth()->id(),
                            'approved_at' => now(),
                            'rejection_reason' => $data['rejection_reason'],
                        ]);
                    }),
                
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('created_at', 'desc');
    }
    
    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Informações da Solicitação')
                    ->schema([
                        TextEntry::make('employee.name')
                            ->label('Funcionário'),
                        TextEntry::make('company.name')
                            ->label('Empresa'),
                        TextEntry::make('vacation_type')
                            ->label('Tipo de Férias')
                            ->formatStateUsing(fn (string $state): string => match ($state) {
                                'annual_leave' => 'Férias Anuais',
                                'maternity_leave' => 'Licença de Maternidade',
                                'paternity_leave' => 'Licença de Paternidade',
                                'sick_leave' => 'Baixa Médica',
                                'marriage_leave' => 'Licença de Casamento',
                                'bereavement_leave' => 'Licença por Luto',
                                'study_leave' => 'Licença para Estudos',
                                'unpaid_leave' => 'Licença Sem Vencimento',
                                'compensatory_leave' => 'Férias Compensatórias',
                                'advance_leave' => 'Adiantamento de Férias',
                                'other' => 'Outro',
                                // Manter compatibilidade com valores antigos
                                'annual' => 'Férias Anuais',
                                'compensatory' => 'Férias Compensatórias',
                                'advance' => 'Adiantamento de Férias',
                                default => $state,
                            }),
                    ])->columns(3),
                
                Section::make('Período de Férias')
                    ->schema([
                        TextEntry::make('start_date')
                            ->label('Data de Início')
                            ->date('d/m/Y'),
                        TextEntry::make('end_date')
                            ->label('Data de Fim')
                            ->date('d/m/Y'),
                        TextEntry::make('requested_days')
                            ->label('Dias Solicitados')
                            ->suffix(' dias'),
                    ])->columns(3),
                
                Section::make('Status e Aprovação')
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
                            ->visible(fn ($record) => in_array($record->status, ['approved', 'rejected'])),
                        TextEntry::make('approved_at')
                            ->label('Data de Aprovação')
                            ->dateTime('d/m/Y H:i')
                            ->visible(fn ($record) => in_array($record->status, ['approved', 'rejected'])),
                    ])->columns(3),
                
                Section::make('Observações')
                    ->schema([
                        TextEntry::make('employee_notes')
                            ->label('Observações do Funcionário')
                            ->placeholder('Nenhuma observação do funcionário'),
                        TextEntry::make('rejection_reason')
                            ->label('Motivo da Rejeição')
                            ->visible(fn ($record) => $record->status === 'rejected')
                            ->placeholder('Nenhum motivo informado'),
                        TextEntry::make('manager_notes')
                            ->label('Observações do Gestor')
                            ->placeholder('Nenhuma observação do gestor'),
                    ]),
                
                Section::make('Auditoria')
                    ->schema([
                        TextEntry::make('employee.name')
                            ->label('Solicitado por'),
                        TextEntry::make('created_at')
                            ->label('Solicitado em')
                            ->dateTime('d/m/Y H:i'),
                        TextEntry::make('updated_at')
                            ->label('Atualizado em')
                            ->dateTime('d/m/Y H:i'),
                    ])->columns(3),
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
            'index' => Pages\ListVacations::route('/'),
            'create' => Pages\CreateVacation::route('/create'),
            'view' => Pages\ViewVacation::route('/{record}'),
            'edit' => Pages\EditVacation::route('/{record}/edit'),
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->user()->can('viewAny', Vacation::class);
    }

    public static function canViewAny(): bool
    {
        return auth()->user()->can('viewAny', Vacation::class);
    }

    public static function canCreate(): bool
    {
        return auth()->user()->can('create', Vacation::class);
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
        return auth()->user()->can('viewAny', Vacation::class);
    }
}