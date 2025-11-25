<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Lead;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components;
use Modules\CRM\Filament\Resources\LeadResource\Pages;
use App\Models\User;
use Filament\Notifications\Notification; // ADICIONADO

class LeadResource extends Resource
{
    protected static ?string $model = Lead::class;

    protected static ?string $navigationIcon = 'heroicon-o-user-plus';

    protected static ?string $navigationLabel = 'Leads';

    protected static ?string $modelLabel = 'Lead';

    protected static ?string $pluralModelLabel = 'Leads';

    protected static ?string $navigationGroup = 'CRM';

    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações do Lead')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nome')
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('phone')
                            ->label('Telefone')
                            ->tel()
                            ->maxLength(255),

                        Forms\Components\TextInput::make('company')
                            ->label('Empresa')
                            ->maxLength(255),
                    ])
                    ->columns(2),

                Forms\Components\Section::make('Detalhes do Lead')
                    ->schema([
                        Forms\Components\Select::make('status')
                            ->label('Status')
                            ->options(Lead::getStatuses())
                            ->default('new')
                            ->required(),

                        Forms\Components\Select::make('source')
                            ->label('Origem')
                            ->options(Lead::getSources())
                            ->required(),

                        Forms\Components\Select::make('assigned_to')
                            ->label('Responsável')
                            ->options(User::pluck('name', 'id'))
                            ->searchable()
                            ->preload(),

                        Forms\Components\TextInput::make('value')
                            ->label('Valor Estimado')
                            ->numeric()
                            ->prefix('€')
                            ->step(0.01),

                        Forms\Components\DatePicker::make('expected_close_date')
                            ->label('Data Prevista de Fechamento'),

                        Forms\Components\Textarea::make('notes')
                            ->label('Observações')
                            ->rows(3)
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => 
                $query->with('assignedTo')->select([
                    'id',
                    'name',
                    'email',
                    'phone',            // <- Adicionado
                    'company',
                    'status',
                    'source',
                    'assigned_to',
                    'value',
                    'expected_close_date',
                    'created_at',
                    'deleted_at',
                ])
            )
            ->paginationPageOptions([10, 25, 50, 100, 250])
            ->defaultPaginationPageOption(25)
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),

                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable()
                    ->sortable(),
                Tables\Columns\TextColumn::make('phone')
                    ->label('Telefone'),

               // Tables\Columns\TextColumn::make('company')
               //     ->label('Empresa')
               //     ->searchable()
               //     ->sortable(),

                Tables\Columns\BadgeColumn::make('status')
                    ->label('Status')
                    ->formatStateUsing(fn (string $state): string => Lead::getStatuses()[$state] ?? $state)
                    ->color(fn (Lead $record): string => $record->status_color),

                Tables\Columns\TextColumn::make('source')
                    ->label('Origem')
                    ->formatStateUsing(fn (string $state): string => Lead::getSources()[$state] ?? $state),

                Tables\Columns\TextColumn::make('assignedTo.name')
                    ->label('Responsável')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('value')
                    ->label('Valor')
                    ->money('EUR')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('expected_close_date')
                    ->label('Data Prevista')
                    ->date('d/m/Y')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),

                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('status')
                    ->label('Status')
                    ->options(Lead::getStatuses()),

                Tables\Filters\SelectFilter::make('source')
                    ->label('Origem')
                    ->options(Lead::getSources()),

                Tables\Filters\SelectFilter::make('assigned_to')
                    ->label('Responsável')
                    ->options(User::pluck('name', 'id')),

                Tables\Filters\TrashedFilter::make(),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                Tables\Actions\ForceDeleteAction::make()
                    ->requiresConfirmation()
                    ->modalHeading('Apagar definitivamente')
                    ->modalDescription('Esta ação remove o lead do banco de dados.'),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make()
                        ->label('Apagar definitivamente')
                        ->requiresConfirmation()
                        ->deselectRecordsAfterCompletion()
                        ->action(function (\Illuminate\Database\Eloquent\Collection $records) {
                            $ids = $records->pluck('id')->all();
                            if (empty($ids)) {
                                return;
                            }

                            try {
                                // Hard delete em lote
                                $deleted = Lead::whereIn('id', $ids)->forceDelete();

                                Notification::make()
                                    ->title('Apagar leads')
                                    ->body("Removidos permanentemente: {$deleted}.")
                                    ->success()
                                    ->send();
                            } catch (\Throwable $e) {
                                Notification::make()
                                    ->title('Erro ao apagar permanentemente')
                                    ->body('Ocorreu um erro durante a operação. Verifique os logs.')
                                    ->danger()
                                    ->send();
                            }
                        }),
                    Tables\Actions\RestoreBulkAction::make(),
                    Tables\Actions\ForceDeleteBulkAction::make()
                        ->requiresConfirmation()
                        ->modalHeading('Apagar permanentemente')
                        ->modalDescription('Esta ação não pode ser desfeita. Os leads serão removidos permanentemente.')
                        ->action(function (\Illuminate\Database\Eloquent\Collection $records) {
                            try {
                                // Operação em lote para force delete
                                $ids = $records->pluck('id')->toArray();
                                $deleted = Lead::whereIn('id', $ids)->forceDelete();

                                Notification::make()
                                    ->title('Apagar permanentemente')
                                    ->body("Removidos permanentemente: {$deleted} leads.")
                                    ->success()
                                    ->send();

                            } catch (\Throwable $e) {
                                Notification::make()
                                    ->title('Erro ao apagar permanentemente')
                                    ->body('Ocorreu um erro durante a operação. Verifique os logs.')
                                    ->danger()
                                    ->send();
                            }
                        }),
                ]),
            ])
            ->defaultSort('created_at', 'desc');

        return $table;
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Components\Section::make('Informações do Lead')
                    ->schema([
                        Components\TextEntry::make('name')
                            ->label('Nome'),
                        Components\TextEntry::make('email')
                            ->label('Email'),
                        Components\TextEntry::make('phone')
                            ->label('Telefone'),
                        Components\TextEntry::make('company')
                            ->label('Empresa'),
                    ])
                    ->columns(2),

                Components\Section::make('Detalhes')
                    ->schema([
                        Components\TextEntry::make('status')
                            ->label('Status')
                            ->formatStateUsing(fn (string $state): string => Lead::getStatuses()[$state] ?? $state)
                            ->badge()
                            ->color(fn (Lead $record): string => $record->status_color),
                        Components\TextEntry::make('source')
                            ->label('Origem')
                            ->formatStateUsing(fn (string $state): string => Lead::getSources()[$state] ?? $state),
                        Components\TextEntry::make('assignedTo.name')
                            ->label('Responsável'),
                        Components\TextEntry::make('value')
                            ->label('Valor Estimado')
                            ->money('BRL'),
                        Components\TextEntry::make('expected_close_date')
                            ->label('Data Prevista de Fechamento')
                            ->date('d/m/Y'),
                        Components\TextEntry::make('notes')
                            ->label('Observações')
                            ->columnSpanFull(),
                    ])
                    ->columns(2),

                Components\Section::make('Informações do Sistema')
                    ->schema([
                        Components\TextEntry::make('created_at')
                            ->label('Criado em')
                            ->dateTime('d/m/Y H:i:s'),
                        Components\TextEntry::make('updated_at')
                            ->label('Atualizado em')
                            ->dateTime('d/m/Y H:i:s'),
                    ])
                    ->columns(2),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListLeads::route('/'),
            'create' => Pages\CreateLead::route('/create'),
            'view' => Pages\ViewLead::route('/{record}'),
            'edit' => Pages\EditLead::route('/{record}/edit'),
        ];
    }
}