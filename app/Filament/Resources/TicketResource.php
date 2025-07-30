<?php

namespace App\Filament\Resources;

use App\Filament\Resources\TicketResource\Pages;
use App\Filament\Resources\TicketResource\RelationManagers;
use App\Models\Ticket;
use App\Models\Company;
use App\Models\Category;
use App\Models\Department;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Filament\Support\Enums\FontWeight;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\DateTimePicker;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Grid;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\BadgeEntry;
use Filament\Infolists\Components\Section as InfoSection;

class TicketResource extends Resource
{
    protected static ?string $model = Ticket::class;
    
    protected static ?string $navigationGroup = 'Chamados';
    protected static ?string $navigationIcon = 'heroicon-o-ticket';
    protected static ?string $navigationLabel = 'Tickets';
    protected static ?string $modelLabel = 'Ticket';
    protected static ?string $pluralModelLabel = 'Tickets';
    protected static ?int $navigationSort = 1;
    
    // Preload de relacionamentos para melhor performance
    protected static ?string $recordTitleAttribute = 'title';
    
    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()
            ->with([
                'company:id,name',
                'category:id,name,color',
                'department:id,name,color',
                'user:id,name,email',
                'assignedTo:id,name,email'
            ]);
    }

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Section::make('Informações Básicas')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                Select::make('company_id')
                                    ->label('Empresa')
                                    ->relationship('company', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->required()
                                    ->reactive()
                                    ->afterStateUpdated(fn (callable $set) => $set('department_id', null)),
                                    
                                Select::make('department_id')
                                    ->label('Departamento')
                                    ->relationship(
                                        name: 'department',
                                        titleAttribute: 'name',
                                        modifyQueryUsing: fn (Builder $query, callable $get) => 
                                            $query->where('company_id', $get('company_id'))
                                    )
                                    ->searchable()
                                    ->preload()
                                    ->nullable(),
                            ]),
                            
                        TextInput::make('title')
                            ->label('Título')
                            ->required()
                            ->maxLength(255)
                            ->columnSpanFull(),
                            
                        Textarea::make('description')
                            ->label('Descrição')
                            ->required()
                            ->rows(4)
                            ->columnSpanFull(),
                    ]),
                    
                Section::make('Classificação')
                    ->schema([
                        Grid::make(3)
                            ->schema([
                                Select::make('status')
                                    ->label('Status')
                                    ->options(Ticket::getStatuses())
                                    ->required()
                                    ->default(Ticket::STATUS_OPEN),
                                    
                                Select::make('priority')
                                    ->label('Prioridade')
                                    ->options(Ticket::getPriorities())
                                    ->required()
                                    ->default(Ticket::PRIORITY_MEDIUM),
                                    
                                Select::make('category_id')
                                    ->label('Categoria')
                                    ->relationship('category', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->nullable(),
                            ]),
                    ]),
                    
                Section::make('Atribuição')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                Select::make('user_id')
                                    ->label('Criado por')
                                    ->relationship('user', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->required(),
                                    
                                Select::make('assigned_to')
                                    ->label('Atribuído para')
                                    ->relationship('assignedTo', 'name')
                                    ->searchable()
                                    ->preload()
                                    ->nullable(),
                            ]),
                    ]),
                    
                Section::make('Prazos')
                    ->schema([
                        Grid::make(2)
                            ->schema([
                                DateTimePicker::make('due_date')
                                    ->label('Data de Vencimento')
                                    ->nullable(),
                                    
                                DateTimePicker::make('resolved_at')
                                    ->label('Resolvido em')
                                    ->nullable()
                                    ->disabled(fn (string $operation): bool => $operation === 'create'),
                            ]),
                    ])
                    ->collapsible(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('id')
                    ->label('#')
                    ->sortable()
                    ->searchable(),
                    
                TextColumn::make('title')
                    ->label('Título')
                    ->searchable()
                    ->sortable()
                    ->weight(FontWeight::Medium)
                    ->limit(50)
                    ->tooltip(function (TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 50 ? $state : null;
                    }),
                    
                BadgeColumn::make('status')
                    ->label('Status')
                    ->formatStateUsing(fn (string $state): string => Ticket::getStatuses()[$state] ?? $state)
                    ->colors([
                        'info' => Ticket::STATUS_OPEN,
                        'warning' => Ticket::STATUS_IN_PROGRESS,
                        'gray' => Ticket::STATUS_PENDING,
                        'success' => Ticket::STATUS_RESOLVED,
                        'danger' => Ticket::STATUS_CLOSED,
                    ])
                    ->sortable(),
                    
                BadgeColumn::make('priority')
                    ->label('Prioridade')
                    ->formatStateUsing(fn (string $state): string => Ticket::getPriorities()[$state] ?? $state)
                    ->colors([
                        'success' => Ticket::PRIORITY_LOW,
                        'warning' => Ticket::PRIORITY_MEDIUM,
                        'danger' => [Ticket::PRIORITY_HIGH, Ticket::PRIORITY_URGENT],
                    ])
                    ->sortable(),
                    
                TextColumn::make('company.name')
                    ->label('Empresa')
                    ->searchable()
                    ->sortable()
                    ->toggleable(),
                    
                TextColumn::make('category.name')
                    ->label('Categoria')
                    ->badge()
                    ->color(fn ($record) => $record->category?->color ?? 'gray')
                    ->sortable()
                    ->toggleable(),
                    
                TextColumn::make('department.name')
                    ->label('Departamento')
                    ->badge()
                    ->color(fn ($record) => $record->department?->color ?? 'gray')
                    ->sortable()
                    ->toggleable(),
                    
                TextColumn::make('user.name')
                    ->label('Criado por')
                    ->searchable()
                    ->sortable()
                    ->toggleable(),
                    
                TextColumn::make('assignedTo.name')
                    ->label('Atribuído para')
                    ->searchable()
                    ->sortable()
                    ->placeholder('Não atribuído')
                    ->toggleable(),
                    
                TextColumn::make('due_date')
                    ->label('Vencimento')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->color(fn ($record) => $record->isOverdue() ? 'danger' : null)
                    ->weight(fn ($record) => $record->isOverdue() ? FontWeight::Bold : null)
                    ->toggleable(),
                    
                TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
                    
                TextColumn::make('updated_at')
                    ->label('Atualizado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options(Ticket::getStatuses())
                    ->multiple(),
                    
                SelectFilter::make('priority')
                    ->label('Prioridade')
                    ->options(Ticket::getPriorities())
                    ->multiple(),
                    
                SelectFilter::make('company_id')
                    ->label('Empresa')
                    ->relationship('company', 'name')
                    ->searchable()
                    ->preload(),
                    
                SelectFilter::make('category_id')
                    ->label('Categoria')
                    ->relationship('category', 'name')
                    ->searchable()
                    ->preload(),
                    
                SelectFilter::make('department_id')
                    ->label('Departamento')
                    ->relationship('department', 'name')
                    ->searchable()
                    ->preload(),
                    
                SelectFilter::make('assigned_to')
                    ->label('Atribuído para')
                    ->relationship('assignedTo', 'name')
                    ->searchable()
                    ->preload(),
                    
                Filter::make('overdue')
                    ->label('Em atraso')
                    ->query(fn (Builder $query): Builder => $query->overdue())
                    ->toggle(),
                    
                Filter::make('unassigned')
                    ->label('Não atribuídos')
                    ->query(fn (Builder $query): Builder => $query->whereNull('assigned_to'))
                    ->toggle(),
                    
                Filter::make('created_today')
                    ->label('Criados hoje')
                    ->query(fn (Builder $query): Builder => $query->whereDate('created_at', today()))
                    ->toggle(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make()
                    ->label('Ver'),
                Tables\Actions\EditAction::make()
                    ->label('Editar'),
                Tables\Actions\Action::make('assign')
                    ->label('Atribuir')
                    ->icon('heroicon-o-user-plus')
                    ->form([
                        Select::make('assigned_to')
                            ->label('Atribuir para')
                            ->relationship('assignedTo', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                    ])
                    ->action(function (array $data, Ticket $record): void {
                        $record->update(['assigned_to' => $data['assigned_to']]);
                    })
                    ->visible(fn (Ticket $record): bool => !$record->assigned_to),
                    
                Tables\Actions\Action::make('change_status')
                    ->label('Alterar Status')
                    ->icon('heroicon-o-arrow-path')
                    ->form([
                        Select::make('status')
                            ->label('Novo Status')
                            ->options(Ticket::getStatuses())
                            ->required(),
                    ])
                    ->action(function (array $data, Ticket $record): void {
                        $updateData = ['status' => $data['status']];
                        if ($data['status'] === Ticket::STATUS_RESOLVED) {
                            $updateData['resolved_at'] = now();
                        }
                        $record->update($updateData);
                    }),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->label('Excluir selecionados'),
                    Tables\Actions\BulkAction::make('bulk_assign')
                        ->label('Atribuir em massa')
                        ->icon('heroicon-o-user-plus')
                        ->form([
                            Select::make('assigned_to')
                                ->label('Atribuir para')
                                ->relationship('assignedTo', 'name')
                                ->searchable()
                                ->preload()
                                ->required(),
                        ])
                        ->action(function (array $data, $records): void {
                            foreach ($records as $record) {
                                $record->update(['assigned_to' => $data['assigned_to']]);
                            }
                        }),
                    Tables\Actions\BulkAction::make('bulk_status')
                        ->label('Alterar status em massa')
                        ->icon('heroicon-o-arrow-path')
                        ->form([
                            Select::make('status')
                                ->label('Novo Status')
                                ->options(Ticket::getStatuses())
                                ->required(),
                        ])
                        ->action(function (array $data, $records): void {
                            foreach ($records as $record) {
                                $updateData = ['status' => $data['status']];
                                if ($data['status'] === Ticket::STATUS_RESOLVED) {
                                    $updateData['resolved_at'] = now();
                                }
                                $record->update($updateData);
                            }
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc')
            ->poll('30s') // Atualização automática a cada 30 segundos
            ->striped();
    }

    public static function getRelations(): array
    {
        return [
                RelationManagers\CommentsRelationManager::class,
                RelationManagers\AttachmentsRelationManager::class,
        ];
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListTickets::route('/'),
            'create' => Pages\CreateTicket::route('/create'),
            'edit' => Pages\EditTicket::route('/{record}'),
            
        ];
    }
    
    public static function getNavigationBadge(): ?string
    {
        return static::getModel()::where('status', Ticket::STATUS_OPEN)->count();
    }
    
    public static function getNavigationBadgeColor(): string|array|null
    {
        $openTickets = static::getModel()::where('status', Ticket::STATUS_OPEN)->count();
        
        if ($openTickets > 10) {
            return 'danger';
        } elseif ($openTickets > 5) {
            return 'warning';
        }
        
        return 'success';
    }
}


