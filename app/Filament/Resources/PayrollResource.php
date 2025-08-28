<?php

namespace App\Filament\Resources;

use App\Filament\Resources\PayrollResource\Pages;
use App\Models\Payroll;
use App\Models\Employee;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Forms\Get;
use Filament\Forms\Set;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\Eloquent\Model;

class PayrollResource extends Resource
{
    protected static ?string $model = Payroll::class;

    protected static ?string $navigationIcon = 'heroicon-o-currency-euro';
    
    protected static ?string $navigationLabel = 'Holerites';
    
    protected static ?string $modelLabel = 'Holerite';
    
    protected static ?string $pluralModelLabel = 'Holerites';
    
    protected static ?string $navigationGroup = 'Recursos Humanos';
    
    protected static ?int $navigationSort = 1;

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
                Forms\Components\Section::make('Informações do Holerite')
                    ->schema([
                        Forms\Components\Select::make('employee_id')
                            ->label('Funcionário')
                            ->relationship('employee', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Set $set, Get $get, $state) {
                                if ($state) {
                                    $employee = \App\Models\Employee::with('company')->find($state);
                                    if ($employee) {
                                        if ($employee->company) {
                                            $set('company_id', $employee->company->id);
                                        }
                                        if ($employee->salary) {
                                            $set('base_salary', $employee->salary);
                                        }
                                    }
                                }
                            }),
                        
                        Forms\Components\Select::make('company_id')
                            ->label('Empresa')
                            ->relationship('company', 'name')
                            ->searchable()
                            ->preload()
                            ->required()
                            ->disabled(fn (Get $get) => filled($get('employee_id')))
                            ->dehydrated(),
                        
                        Forms\Components\Select::make('reference_month')
                            ->label('Mês de Referência')
                            ->options([
                                1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
                                5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
                                9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
                            ])
                            ->required()
                            ->default(now()->month),
                        
                        Forms\Components\Select::make('reference_year')
                            ->label('Ano de Referência')
                            ->options(function () {
                                $currentYear = now()->year;
                                $years = [];
                                for ($i = $currentYear - 2; $i <= $currentYear + 1; $i++) {
                                    $years[$i] = $i;
                                }
                                return $years;
                            })
                            ->required()
                            ->default(now()->year),
                    ])->columns(2),
                
                Forms\Components\Section::make('Valores Salariais')
                    ->schema([
                        Forms\Components\TextInput::make('base_salary')
                            ->label('Salário Base')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->required()
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('overtime_amount')
                            ->label('Valor Horas Extras')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        Forms\Components\TextInput::make('overtime_hours')
                            ->label('Horas Extras')
                            ->numeric()
                            ->step(0.01)
                            ->default(0),
                    ])->columns(3),
                
                Forms\Components\Section::make('Subsídios')
                    ->schema([
                        Forms\Components\TextInput::make('holiday_allowance')
                            ->label('Subsídio de Férias')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('christmas_allowance')
                            ->label('Subsídio de Natal')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('meal_allowance')
                            ->label('Subsídio de Alimentação')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('transport_allowance')
                            ->label('Subsídio de Transporte')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('other_allowances')
                            ->label('Outros Subsídios')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                    ])->columns(3),
                
                Forms\Components\Section::make('Deduções')
                    ->schema([
                        Forms\Components\TextInput::make('social_security_employee')
                            ->label('Segurança Social (11%)')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('irs_withholding')
                            ->label('Retenção IRS')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('union_fee')
                            ->label('Quota Sindical')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                        
                        Forms\Components\TextInput::make('other_deductions')
                            ->label('Outras Deduções')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->default(0)
                            ->live()
                            ->afterStateUpdated(function (Get $get, Set $set) {
                                self::updateTotals($get, $set);
                            }),
                    ])->columns(2),
                
                Forms\Components\Section::make('Totais')
                    ->schema([
                        Forms\Components\TextInput::make('gross_total')
                            ->label('Total Bruto')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->disabled()
                            ->dehydrated(),
                        
                        Forms\Components\TextInput::make('total_deductions')
                            ->label('Total Deduções')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->disabled()
                            ->dehydrated(),
                        
                        Forms\Components\TextInput::make('net_total')
                            ->label('Total Líquido')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01)
                            ->disabled()
                            ->dehydrated(),
                    ])->columns(3),
                
                Forms\Components\Section::make('Observações')
                    ->schema([
                        Forms\Components\Textarea::make('notes')
                            ->label('Observações')
                            ->rows(3),
                    ])
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
                
                Tables\Columns\TextColumn::make('pay_period_start')
                    ->label('Período')
                    ->date('d/m/Y')
                    ->formatStateUsing(fn ($record) => 
                        $record->pay_period_start->format('d/m/Y') . ' - ' . 
                        $record->pay_period_end->format('d/m/Y')
                    )
                    ->sortable(),
                
                // Remover esta coluna da tabela:
                // Tables\Columns\TextColumn::make('pay_date')
                //     ->label('Data de Pagamento')
                //     ->date('d/m/Y')
                //     ->sortable(),
                
                // Substituir por:
                Tables\Columns\TextColumn::make('reference_period')
                    ->label('Período de Referência')
                    ->getStateUsing(fn ($record) => $record->reference_month_name . '/' . $record->reference_year)
                    ->sortable(['reference_year', 'reference_month']),
                
                Tables\Columns\TextColumn::make('gross_total')
                    ->label('Salário Bruto')
                    ->money('EUR')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('net_total')
                    ->label('Salário Líquido')
                    ->money('EUR')
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
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
                
                // Remover o filtro pay_date:
                // Tables\Filters\Filter::make('pay_date')
                //     ->form([
                //         Forms\Components\DatePicker::make('pay_date_from')
                //             ->label('Data de Pagamento (De)'),
                //         Forms\Components\DatePicker::make('pay_date_to')
                //             ->label('Data de Pagamento (Até)'),
                //     ])
                //     ->query(function (Builder $query, array $data): Builder {
                //         return $query
                //             ->when(
                //                 $data['pay_date_from'],
                //                 fn (Builder $query, $date): Builder => $query->whereDate('pay_date', '>=', $date),
                //             )
                //             ->when(
                //                 $data['pay_date_to'],
                //                 fn (Builder $query, $date): Builder => $query->whereDate('pay_date', '<=', $date),
                //             );
                //     }),
                
                // Substituir por:
                Tables\Filters\SelectFilter::make('reference_year')
                    ->label('Ano de Referência')
                    ->options(function () {
                        $currentYear = now()->year;
                        $years = [];
                        for ($i = $currentYear - 2; $i <= $currentYear + 1; $i++) {
                            $years[$i] = $i;
                        }
                        return $years;
                    }),
                
                Tables\Filters\SelectFilter::make('reference_month')
                    ->label('Mês de Referência')
                    ->options([
                        1 => 'Janeiro', 2 => 'Fevereiro', 3 => 'Março', 4 => 'Abril',
                        5 => 'Maio', 6 => 'Junho', 7 => 'Julho', 8 => 'Agosto',
                        9 => 'Setembro', 10 => 'Outubro', 11 => 'Novembro', 12 => 'Dezembro'
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('reference_year', 'desc')
            ->defaultSort('reference_month', 'desc');
    }
    
    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Informações do Holerite')
                    ->schema([
                        TextEntry::make('employee.name')
                            ->label('Funcionário'),
                        TextEntry::make('company.name')
                            ->label('Empresa'),
                        TextEntry::make('pay_period_start')
                            ->label('Início do Período')
                            ->date('d/m/Y'),
                        TextEntry::make('pay_period_end')
                            ->label('Fim do Período')
                            ->date('d/m/Y'),
                        TextEntry::make('reference_period')
                            ->label('Período de Referência')
                            ->getStateUsing(fn ($record) => $record->reference_month_name . '/' . $record->reference_year),
                    ])->columns(2),
                
                Section::make('Valores Salariais')
                    ->schema([
                        TextEntry::make('base_salary')
                            ->label('Salário Base')
                            ->money('EUR'),
                        TextEntry::make('overtime_hours')
                            ->label('Horas Extras')
                            ->suffix(' horas'),
                        TextEntry::make('overtime_amount')
                            ->label('Valor Horas Extras')
                            ->money('EUR'),
                    ])->columns(3),
                
                Section::make('Subsídios')
                    ->schema([
                        TextEntry::make('meal_allowance')
                            ->label('Subsídio de Alimentação')
                            ->money('EUR'),
                        TextEntry::make('transport_allowance')
                            ->label('Subsídio de Transporte')
                            ->money('EUR'),
                        TextEntry::make('other_allowances')
                            ->label('Outros Subsídios')
                            ->money('EUR'),
                    ])->columns(3),
                
                Section::make('Deduções')
                    ->schema([
                        TextEntry::make('social_security')
                            ->label('Segurança Social')
                            ->money('EUR'),
                        TextEntry::make('income_tax')
                            ->label('IRS')
                            ->money('EUR'),
                        TextEntry::make('other_deductions')
                            ->label('Outras Deduções')
                            ->money('EUR'),
                    ])->columns(3),
                
                Section::make('Totais')
                    ->schema([
                        TextEntry::make('gross_pay')
                            ->label('Salário Bruto')
                            ->money('EUR')
                            ->weight('bold'),
                        TextEntry::make('net_pay')
                            ->label('Salário Líquido')
                            ->money('EUR')
                            ->weight('bold'),
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
                        TextEntry::make('createdBy.name')
                            ->label('Criado por'),
                        TextEntry::make('created_at')
                            ->label('Criado em')
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
            'index' => Pages\ListPayrolls::route('/'),
            'create' => Pages\CreatePayroll::route('/create'),
            'view' => Pages\ViewPayroll::route('/{record}'),
            'edit' => Pages\EditPayroll::route('/{record}/edit'),
        ];
    }
    
    private static function updateTotals(Get $get, Set $set): void
    {
        // Calcular total bruto
        $grossTotal = collect([
            'base_salary',
            'overtime_amount', 
            'holiday_allowance',
            'christmas_allowance',
            'meal_allowance',
            'transport_allowance',
            'other_allowances'
        ])->sum(fn($field) => (float) ($get($field) ?? 0));
        
        // Calcular total de deduções
        $totalDeductions = collect([
            'social_security_employee',
            'irs_withholding',
            'union_fee', 
            'other_deductions'
        ])->sum(fn($field) => (float) ($get($field) ?? 0));
        
        // Calcular total líquido
        $netTotal = $grossTotal - $totalDeductions;
        
        // Atualizar os campos
        $set('gross_total', number_format($grossTotal, 2, '.', ''));
        $set('total_deductions', number_format($totalDeductions, 2, '.', ''));
        $set('net_total', number_format($netTotal, 2, '.', ''));
    }
    public static function canAccess(): bool
    {
        return auth()->user()->can('viewAny', Payroll::class);
    }

    public static function canViewAny(): bool
    {
        return auth()->user()->can('viewAny', Payroll::class);
    }

    public static function canCreate(): bool
    {
        return auth()->user()->can('create', Payroll::class);
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
        return auth()->user()->can('viewAny', Payroll::class);
    }
}