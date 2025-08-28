<?php

namespace App\Filament\Employee\Resources;

use App\Filament\Employee\Resources\TicketResource\Pages;
use App\Filament\Employee\Resources\TicketResource\RelationManagers;
use App\Models\Ticket;
use App\Models\EmployeeUser;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section as InfoSection;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Columns\BadgeColumn;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Support\Facades\Auth;

class TicketResource extends Resource
{
    protected static ?string $model = Ticket::class;

    protected static ?string $navigationIcon = 'heroicon-o-ticket';
    
    protected static ?string $navigationLabel = 'Tickets';
    
    protected static ?string $modelLabel = 'Ticket';
    
    protected static ?string $pluralModelLabel = 'Tickets';

    // Adicionar este método para filtrar tickets acessíveis ao funcionário
    public static function getEloquentQuery(): Builder
    {
        $user = auth()->user();
        
        return parent::getEloquentQuery()
            ->with(['company', 'category', 'department', 'user', 'assignedTo'])
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id) // Tickets criados pelo funcionário (apenas user_id)
                      ->orWhere('assigned_to', $user->id); // Tickets atribuídos ao funcionário
            })
            ->when($user->employee && $user->employee->company_id, function ($query) use ($user) {
                // Filtrar apenas tickets da empresa do funcionário
                $query->where('company_id', $user->employee->company_id);
            });
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações Básicas')
                    ->schema([
                        Forms\Components\Select::make('company_id')
                            ->label('Empresa')
                            ->options(function () {
                                $user = Auth::user();
                                if ($user && $user->employee && $user->employee->company_id) {
                                    return \App\Models\Company::where('id', $user->employee->company_id)
                                        ->where('is_active', true)
                                        ->pluck('name', 'id');
                                }
                                return [];
                            })
                            ->default(function () {
                                $user = Auth::user();
                                return $user && $user->employee ? $user->employee->company_id : null;
                            })
                            ->required()
                            ->disabled()
                            ->dehydrated()
                            ->helperText('Empresa do funcionário (não editável)'),
                        
                        Forms\Components\TextInput::make('title')
                            ->label('Título')
                            ->required()
                            ->maxLength(255)
                            ->columnSpanFull(),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Descrição')
                            ->required()
                            ->rows(4)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Classificação')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options(\App\Models\Ticket::getStatuses())
                            ->default(\App\Models\Ticket::STATUS_OPEN)
                            ->required()
                            ->native(false),
                        
                        Forms\Components\Select::make('priority')
                            ->label('Prioridade')
                            ->options(\App\Models\Ticket::getPriorities())
                            ->default(\App\Models\Ticket::PRIORITY_MEDIUM)
                            ->required()
                            ->native(false),
                        
                        Forms\Components\Select::make('category_id')
                            ->label('Categoria')
                            ->options(function () {
                                $user = Auth::user();
                                if ($user && $user->employee && $user->employee->company_id) {
                                    return \App\Models\Category::where('company_id', $user->employee->company_id)
                                        ->where('is_active', true)
                                        ->pluck('name', 'id');
                                }
                                return [];
                            })
                            ->searchable()
                            ->preload()
                            ->nullable()
                            ->helperText('Apenas categorias da sua empresa'),
                        
                        Forms\Components\Select::make('department_id')
                            ->label('Departamento')
                            ->options(function () {
                                $user = Auth::user();
                                if ($user && $user->employee && $user->employee->company_id) {
                                    return \App\Models\Department::where('company_id', $user->employee->company_id)
                                        ->where('is_active', true)
                                        ->pluck('name', 'id');
                                }
                                return [];
                            })
                            ->searchable()
                            ->preload()
                            ->nullable()
                            ->helperText('Apenas departamentos da sua empresa'),
                    ])
                    ->columns(2),
                
                Forms\Components\Section::make('Atribuição e Prazos')
                    ->schema([
                        Forms\Components\Select::make('assigned_to')
                            ->label('Atribuído para')
                            ->relationship(
                                name: 'assignedTo',
                                titleAttribute: 'name',
                                modifyQueryUsing: fn ($query) => $query
                                    ->where('is_active', true)
                                    ->whereHas('roleModel', fn ($q) => $q->where('name', 'agent'))
                            )
                            ->searchable()
                            ->preload()
                            ->nullable()
                            ->helperText('Apenas usuários com cargo de agente podem ser atribuídos'),

                        Forms\Components\DateTimePicker::make('due_date')
                            ->label('Data de Vencimento')
                            ->nullable()
                            ->native(false)
                            ->displayFormat('d/m/Y H:i')
                            ->helperText('Data limite para resolução do ticket'),
                        
                        Forms\Components\DateTimePicker::make('resolved_at')
                            ->label('Data de Resolução')
                            ->nullable()
                            ->native(false)
                            ->displayFormat('d/m/Y H:i')
                            ->visible(fn ($record) => $record && in_array($record->status, ['resolvido', 'fechado']))
                            ->helperText('Data em que o ticket foi resolvido'),
                    ])
                    ->columns(2)
                    ->collapsible(),
                
                // Campos ocultos para o relacionamento polimórfico
                Forms\Components\Hidden::make('user_id')
                    ->default(fn () => Auth::id()),
                
                Forms\Components\Hidden::make('user_type')
                    ->default(EmployeeUser::class),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('company.name')
                    ->label('Empresa')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->limit(50),
                BadgeColumn::make('status')
                    ->label('Status')
                    ->formatStateUsing(fn (string $state): string => \App\Models\Ticket::getStatuses()[$state] ?? $state)
                    ->colors([
                        'info' => \App\Models\Ticket::STATUS_OPEN,
                        'warning' => \App\Models\Ticket::STATUS_IN_PROGRESS,
                        'gray' => \App\Models\Ticket::STATUS_PENDING,
                        'success' => \App\Models\Ticket::STATUS_RESOLVED,
                        'danger' => \App\Models\Ticket::STATUS_CLOSED,
                    ])
                    ->sortable(),
                BadgeColumn::make('priority')
                    ->label('Prioridade')
                    ->formatStateUsing(fn (string $state): string => \App\Models\Ticket::getPriorities()[$state] ?? $state)
                    ->colors([
                        'success' => \App\Models\Ticket::PRIORITY_LOW,
                        'warning' => \App\Models\Ticket::PRIORITY_MEDIUM,
                        'danger' => [\App\Models\Ticket::PRIORITY_HIGH, \App\Models\Ticket::PRIORITY_URGENT],
                    ])
                    ->sortable(),
                Tables\Columns\TextColumn::make('category.name')
                    ->label('Categoria')
                    ->badge()
                    ->color(fn ($record) => $record->category?->color ?? 'gray')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('assignedTo.name')
                    ->label('Atribuído para')
                    ->placeholder('Não atribuído')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('due_date')
                    ->label('Vencimento')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(),
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                Tables\Columns\TextColumn::make('department.name')
                    ->label('Departamento')
                    ->badge()
                    ->color(fn ($record) => $record->department?->color ?? 'gray')
                    ->sortable()
                    ->toggleable(),
            ])
            ->filters([
                //
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('Ver'),
                Tables\Actions\EditAction::make()
                    ->label('Editar'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->label('Excluir selecionados'),
                ]),
            ]);
    }

    public static function getRelations(): array
    {
        return [
            RelationManagers\CommentsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTickets::route('/'),
            'create' => Pages\CreateTicket::route('/create'),
            'view' => Pages\ViewTicket::route('/{record}'),
            'edit' => Pages\EditTicket::route('/{record}/edit'),
        ];
    }

    public static function getNavigationBadge(): ?string
{
    $user = auth()->user();
    
    return static::getModel()::where('status', \App\Models\Ticket::STATUS_OPEN)
        ->where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                  ->orWhere('assigned_to', $user->id);
        })
        ->when($user->employee && $user->employee->company_id, function ($query) use ($user) {
            $query->where('company_id', $user->employee->company_id);
        })
        ->count();
}

public static function getNavigationBadgeColor(): string|array|null
{
    $user = auth()->user();
    
    $openTickets = static::getModel()::where('status', \App\Models\Ticket::STATUS_OPEN)
        ->where(function ($query) use ($user) {
            $query->where('user_id', $user->id)
                  ->orWhere('assigned_to', $user->id);
        })
        ->when($user->employee && $user->employee->company_id, function ($query) use ($user) {
            $query->where('company_id', $user->employee->company_id);
        })
        ->count();
    
    if ($openTickets > 10) {
        return 'danger';
    } elseif ($openTickets > 5) {
        return 'warning';
    }
    
    return 'success';
}


    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                InfoSection::make('Informações Básicas')
                    ->schema([
                        TextEntry::make('title')
                            ->label('Título'),
                        TextEntry::make('description')
                            ->label('Descrição')
                            ->columnSpanFull(),
                        TextEntry::make('company.name')
                            ->label('Empresa'),
                        TextEntry::make('department.name')
                            ->label('Departamento')
                            ->placeholder('Não definido'),
                    ])
                    ->columns(2),
                
                InfoSection::make('Classificação')
                    ->schema([
                        TextEntry::make('status')
                            ->label('Status')
                            ->formatStateUsing(fn (string $state): string => \App\Models\Ticket::getStatuses()[$state] ?? $state)
                            ->badge()
                            ->color(fn (string $state): string => match($state) {
                                \App\Models\Ticket::STATUS_OPEN => 'info',
                                \App\Models\Ticket::STATUS_IN_PROGRESS => 'warning',
                                \App\Models\Ticket::STATUS_PENDING => 'gray',
                                \App\Models\Ticket::STATUS_RESOLVED => 'success',
                                \App\Models\Ticket::STATUS_CLOSED => 'danger',
                                default => 'gray'
                            }),
                        TextEntry::make('priority')
                            ->label('Prioridade')
                            ->formatStateUsing(fn (string $state): string => \App\Models\Ticket::getPriorities()[$state] ?? $state)
                            ->badge()
                            ->color(fn (string $state): string => match($state) {
                                \App\Models\Ticket::PRIORITY_LOW => 'success',
                                \App\Models\Ticket::PRIORITY_MEDIUM => 'warning',
                                \App\Models\Ticket::PRIORITY_HIGH => 'danger',
                                \App\Models\Ticket::PRIORITY_URGENT => 'danger',
                                default => 'gray'
                            }),
                        TextEntry::make('category.name')
                            ->label('Categoria')
                            ->badge()
                            ->color(fn ($record) => $record->category?->color ?? 'gray')
                            ->placeholder('Não definida'),
                    ])
                    ->columns(3),
                
                InfoSection::make('Atribuição e Prazos')
                    ->schema([
                        TextEntry::make('user.name')
                            ->label('Criado por'),
                        TextEntry::make('assignedTo.name')
                            ->label('Atribuído para')
                            ->placeholder('Não atribuído'),
                        TextEntry::make('due_date')
                            ->label('Data de Vencimento')
                            ->dateTime('d/m/Y H:i')
                            ->placeholder('Não definida'),
                        TextEntry::make('resolved_at')
                            ->label('Data de Resolução')
                            ->dateTime('d/m/Y H:i')
                            ->placeholder('Não resolvido'),
                    ])
                    ->columns(2),
                
                InfoSection::make('Informações do Sistema')
                    ->schema([
                        TextEntry::make('created_at')
                            ->label('Criado em')
                            ->dateTime('d/m/Y H:i:s'),
                        TextEntry::make('updated_at')
                            ->label('Atualizado em')
                            ->dateTime('d/m/Y H:i:s'),
                    ])
                    ->columns(2)
                    ->collapsible(),
            ]);
    }
}

