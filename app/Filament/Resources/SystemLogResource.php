<?php

namespace App\Filament\Resources;

use App\Filament\Resources\SystemLogResource\Pages;
use App\Models\SystemLog;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables\Table;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\BadgeColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\Filter;
use Filament\Forms\Components\DatePicker;
use Illuminate\Database\Eloquent\Builder;
use Filament\Tables\Actions\Action;
use Filament\Infolists\Infolist;
use Filament\Infolists\Components\TextEntry;
use Filament\Infolists\Components\Section;
use Filament\Support\Enums\FontWeight;
use Illuminate\Support\Facades\Response;

class SystemLogResource extends Resource
{
    protected static ?string $model = SystemLog::class;
    protected static ?string $navigationIcon = 'heroicon-o-document-text';
    protected static ?string $navigationLabel = 'Logs do Sistema';
    protected static ?string $modelLabel = 'Log';
    protected static ?string $pluralModelLabel = 'Logs';
    protected static ?string $navigationGroup = 'Relatórios e Logs';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form->schema([]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                TextColumn::make('created_at')
                    ->label('Data/Hora')
                    ->dateTime('d/m/Y H:i:s')
                    ->sortable(),
                    
                BadgeColumn::make('level')
                    ->label('Nível')
                    ->colors([
                        'success' => 'info',
                        'warning' => 'warning', 
                        'danger' => 'error',
                        'gray' => 'critical',
                    ]),
                    
                TextColumn::make('action')
                    ->label('Ação')
                    ->badge()
                    ->searchable(),
                    
                TextColumn::make('user.name')
                    ->label('Usuário')
                    ->formatStateUsing(fn ($state, $record) => $record->user?->name ?? 'Sistema')
                    ->searchable()
                    ->sortable(),
                    
                TextColumn::make('model_type')
                    ->label('Modelo')
                    ->formatStateUsing(fn ($state) => $state ? class_basename($state) : 'N/A')
                    ->searchable(),
                    
                TextColumn::make('description')
                    ->label('Descrição')
                    ->formatStateUsing(function ($state) {
                        if (is_array($state) || is_object($state)) {
                            return 'Dados complexos';
                        }
                        return $state ? (strlen($state) > 50 ? substr($state, 0, 50) . '...' : $state) : 'N/A';
                    })
                    ->searchable(),
                    
                TextColumn::make('ip_address')
                    ->label('IP')
                    ->searchable(),
            ])
            ->filters([
                SelectFilter::make('level')
                    ->label('Nível')
                    ->options([
                        'info' => 'Info',
                        'warning' => 'Aviso',
                        'error' => 'Erro',
                        'critical' => 'Crítico',
                    ]),
                    
                SelectFilter::make('action')
                    ->label('Ação')
                    ->options([
                        'create' => 'Criar',
                        'update' => 'Atualizar',
                        'delete' => 'Excluir',
                        'login' => 'Login',
                        'logout' => 'Logout',
                        'view' => 'Visualizar',
                    ]),
                    
                Filter::make('created_at')
                    ->form([
                        DatePicker::make('created_from')->label('Data Inicial'),
                        DatePicker::make('created_until')->label('Data Final'),
                    ])
                    ->query(function (Builder $query, array $data): Builder {
                        return $query
                            ->when(
                                $data['created_from'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '>=', $date),
                            )
                            ->when(
                                $data['created_until'],
                                fn (Builder $query, $date): Builder => $query->whereDate('created_at', '<=', $date),
                            );
                    }),
            ])
            ->actions([
                Action::make('download_json')
                    ->label('Download JSON')
                    ->icon('heroicon-o-arrow-down-tray')
                    ->url(fn ($record) => route('system-log.download', $record->id))
                    ->openUrlInNewTab()
                    ->color('success'),
            ])
            ->defaultSort('created_at', 'desc');
    }

    public static function infolist(Infolist $infolist): Infolist
    {
        return $infolist
            ->schema([
                Section::make('Informações do Log')
                    ->schema([
                        TextEntry::make('created_at')
                            ->label('Data/Hora')
                            ->dateTime('d/m/Y H:i:s'),
                            
                        TextEntry::make('level')
                            ->label('Nível')
                            ->badge(),
                            
                        TextEntry::make('action')
                            ->label('Ação'),
                            
                        TextEntry::make('user.name')
                            ->label('Utilizador')
                            ->formatStateUsing(fn ($state, $record) => $record->user?->name ?? 'Sistema'),
                            
                        TextEntry::make('model_type')
                            ->label('Modelo')
                            ->formatStateUsing(fn ($state) => $state ? class_basename($state) : 'N/A'),
                            
                        TextEntry::make('model_id')
                            ->label('ID do Modelo'),
                            
                        TextEntry::make('ip_address')
                            ->label('Endereço IP'),
                            
                        TextEntry::make('description')
                            ->label('Descrição')
                            ->formatStateUsing(function ($state) {
                                if (is_array($state) || is_object($state)) {
                                    return 'Dados complexos - Use o download JSON para ver detalhes';
                                }
                                return $state ?? 'N/A';
                            })
                            ->columnSpanFull(),
                            
                        TextEntry::make('context')
                            ->label('Contexto')
                            ->formatStateUsing(function ($state) {
                                if (is_array($state) || is_object($state)) {
                                    return 'Dados complexos - Use o download JSON para ver detalhes';
                                }
                                return $state ?? 'Nenhum contexto adicional';
                            })
                            ->columnSpanFull(),
                    ])
                    ->columns(2),
            ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListSystemLogs::route('/'),
            // Removido a página de view para evitar erros
        ];
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function canEdit($record): bool
    {
        return false;
    }

    public static function canDelete($record): bool
    {
        return false;
    }
}
