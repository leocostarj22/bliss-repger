<?php

namespace App\Filament\Resources;

use App\Filament\Resources\RoleResource\Pages;
use App\Models\Role;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class RoleResource extends Resource
{
    protected static ?string $model = Role::class;

    protected static ?string $navigationIcon = 'heroicon-o-shield-check';
    protected static ?string $navigationLabel = 'Cargos';
    protected static ?string $modelLabel = 'Cargo';
    protected static ?string $pluralModelLabel = 'Cargos';
    protected static ?string $navigationGroup = 'Administração';
    protected static ?int $navigationSort = 2;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações do Cargo')
                    ->schema([
                        Forms\Components\TextInput::make('name')
                            ->label('Nome do Sistema')
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255)
                            ->helperText('Nome usado internamente (ex: admin, manager)'),
                        
                        Forms\Components\TextInput::make('display_name')
                            ->label('Nome de Exibição')
                            ->required()
                            ->maxLength(255)
                            ->helperText('Nome mostrado aos utilizadores'),
                        
                        Forms\Components\Textarea::make('description')
                            ->label('Descrição')
                            ->maxLength(500)
                            ->rows(3),
                        
                        Forms\Components\Toggle::make('is_active')
                            ->label('Ativo')
                            ->default(true),
                    ])->columns(2),
                
                Forms\Components\Section::make('Permissões')
                    ->schema([
                        Forms\Components\CheckboxList::make('permissions')
                            ->label('Permissões')
                            ->options([
                                'tickets.view' => 'Ver Tickets',
                                'tickets.create' => 'Criar Tickets',
                                'tickets.edit' => 'Editar Tickets',
                                'tickets.delete' => 'Eliminar Tickets',
                                'tickets.assign' => 'Atribuir Tickets',
                                'users.view' => 'Ver Utilizadores',
                                'users.create' => 'Criar Utilizadores',
                                'users.edit' => 'Editar Utilizadores',
                                'users.delete' => 'Eliminar Utilizadores',
                                'companies.view' => 'Ver Empresas',
                                'companies.create' => 'Criar Empresas',
                                'companies.edit' => 'Editar Empresas',
                                'companies.delete' => 'Eliminar Empresas',
                                'reports.view' => 'Ver Relatórios',
                                'settings.manage' => 'Gerir Configurações',
                                'admin.access' => 'Acesso Administrativo',
                            ])
                            ->columns(3)
                            ->gridDirection('row'),
                    ]),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\TextColumn::make('display_name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('name')
                    ->label('Sistema')
                    ->searchable()
                    ->badge()
                    ->color('gray'),
                
                Tables\Columns\TextColumn::make('description')
                    ->label('Descrição')
                    ->limit(50)
                    ->tooltip(function (Tables\Columns\TextColumn $column): ?string {
                        $state = $column->getState();
                        return strlen($state) > 50 ? $state : null;
                    }),
                
                Tables\Columns\TextColumn::make('users_count')
                    ->label('Utilizadores')
                    ->counts('users')
                    ->badge()
                    ->color('success'),
                
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Ativo')
                    ->boolean(),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\TernaryFilter::make('is_active')
                    ->label('Status')
                    ->placeholder('Todos')
                    ->trueLabel('Ativos')
                    ->falseLabel('Inativos'),
            ])
            ->actions([
                Tables\Actions\EditAction::make(),
                Tables\Actions\DeleteAction::make(),
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('display_name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListRoles::route('/'),
            'create' => Pages\CreateRole::route('/create'),
            'edit' => Pages\EditRole::route('/{record}/edit'),
        ];
    }
}