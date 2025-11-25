<?php

namespace App\Filament\Resources;

use App\Filament\Resources\UserResource\Pages;
use App\Models\User;
use Filament\Forms;
use Filament\Forms\Get;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Hash;

class UserResource extends Resource
{
    protected static ?string $model = User::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';
    protected static ?string $navigationLabel = 'Utilizadores';
    protected static ?string $modelLabel = 'Utilizador';
    protected static ?string $pluralModelLabel = 'Utilizadores';
    protected static ?string $navigationGroup = 'Administração';
    protected static ?int $navigationSort = 1;

    public static function form(Form $form): Form
    {
        return $form
            ->schema([
                Forms\Components\Section::make('Informações Pessoais')
                    ->schema([
                        Forms\Components\FileUpload::make('photo_path')
                            ->label('Foto')
                            ->image()
                            ->directory('users/photos')
                            ->visibility('public') // Correto para acesso público
                            ->columnSpanFull(),
                        
                        Forms\Components\TextInput::make('name')
                            ->label('Nome')
                            ->required()
                            ->maxLength(255),
                        
                        Forms\Components\TextInput::make('email')
                            ->label('Email')
                            ->email()
                            ->required()
                            ->unique(ignoreRecord: true)
                            ->maxLength(255),
                        
                        Forms\Components\TextInput::make('phone')
                            ->label('Telefone')
                            ->tel()
                            ->maxLength(20),
                        
                        Forms\Components\Textarea::make('bio')
                            ->label('Biografia')
                            ->maxLength(500)
                            ->rows(3),
                    ])->columns(2),
                
                Forms\Components\Section::make('Acesso e Permissões')
                    ->schema([
                        Forms\Components\TextInput::make('password')
                            ->label('Palavra-passe')
                            ->password()
                            ->dehydrateStateUsing(fn ($state) => Hash::make($state))
                            ->dehydrated(fn ($state) => filled($state))
                            ->required(fn (string $context): bool => $context === 'create')
                            ->maxLength(255),
                        
                        Forms\Components\Select::make('role_id')
                            ->label('Cargo')
                            ->relationship('roleModel', 'display_name')
                            ->searchable()
                            ->preload()
                            ->createOptionForm([
                                Forms\Components\TextInput::make('name')
                                    ->required(),
                                Forms\Components\TextInput::make('display_name')
                                    ->required(),
                            ])
                            ->required(),
                        
                        Forms\Components\Select::make('company_id')
                            ->label('Empresa')
                            ->relationship('company', 'name')
                            ->searchable()
                            ->preload()
                            ->required(),
                        
                        Forms\Components\Select::make('department_id')
                            ->label('Departamento')
                            ->options(function (Forms\Get $get) {
                                $companyId = $get('company_id');
                                if (!$companyId) {
                                    return [];
                                }
                                return \App\Models\Department::where('company_id', $companyId)
                                    ->where('is_active', true)
                                    ->pluck('name', 'id');
                            })
                            ->searchable()
                            ->reactive()
                            ->preload()
                            ->afterStateHydrated(function (Forms\Components\Select $component, $state, $record) {
                                // Limpa o departamento se não pertencer à empresa selecionada
                                if ($record && $record->department && $record->company_id !== $record->department->company_id) {
                                    $component->state(null);
                                }
                            }),

                        Forms\Components\Toggle::make('is_active')
                            ->label('Ativo')
                            ->default(true),
                        ])->columns(2),

            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with(['roleModel','company','department']))
            ->defaultPaginationPageSize(25)
            ->columns([
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('email')
                    ->label('Email')
                    ->searchable()
                    ->copyable(),
                
                Tables\Columns\TextColumn::make('roleModel.display_name')
                    ->label('Cargo')
                    ->formatStateUsing(fn ($state, $record) => $record->roleModel?->display_name ?? 'Cargo não definido')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'Administrador' => 'danger',
                        'Gestor' => 'warning',
                        'Supervisor' => 'info',
                        'Agente' => 'success',
                        'Cliente' => 'gray',
                        default => 'gray',
                    }),
                
                Tables\Columns\TextColumn::make('company.name')
                    ->label('Empresa')
                    ->formatStateUsing(fn ($state, $record) => $record->company?->name ?? 'Empresa não definida')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\TextColumn::make('department.name')
                    ->label('Departamento')
                    ->formatStateUsing(fn ($state, $record) => $record->department?->name ?? 'Departamento não definido')
                    ->searchable()
                    ->sortable(),
                
                Tables\Columns\IconColumn::make('is_active')
                    ->label('Ativo')
                    ->boolean(),
                
                Tables\Columns\TextColumn::make('last_login_at')
                    ->label('Último Login')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->placeholder('Nunca'),
                
                Tables\Columns\TextColumn::make('created_at')
                    ->label('Criado em')
                    ->dateTime('d/m/Y H:i')
                    ->sortable()
                    ->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('role_id')
                    ->label('Cargo')
                    ->relationship('roleModel', 'display_name')
                    ->multiple(),
                
                Tables\Filters\SelectFilter::make('company_id')
                    ->label('Empresa')
                    ->relationship('company', 'name')
                    ->multiple(),
                
                Tables\Filters\SelectFilter::make('department_id')
                    ->label('Departamento')
                    ->relationship('department', 'name')
                    ->multiple(),
                
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
            ->defaultSort('name');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListUsers::route('/'),
            'create' => Pages\CreateUser::route('/create'),
            'edit' => Pages\EditUser::route('/{record}/edit'),
        ];
    }
}
