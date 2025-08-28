<?php

namespace App\Filament\Resources;

use App\Filament\Resources\EmployeeResource\Pages;
use App\Models\Employee;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Filament\Forms\Components\Section;
use Filament\Forms\Components\Tabs;
use Filament\Tables\Filters\SelectFilter;
use Filament\Forms\Get;
use Filament\Forms\Set;
use App\Filament\Resources\EmployeeResource\Widgets\EmployeeStatsOverview;
use App\Filament\Resources\EmployeeResource\Widgets\EmployeeStatusWidget;
use App\Filament\Resources\EmployeeResource\Widgets\BirthdayWidget;
use App\Filament\Resources\EmployeeResource\Widgets\NewHiresWidget;
use App\Filament\Resources\EmployeeResource\Widgets\EmployeesByDepartmentChart;
use App\Filament\Resources\EmployeeResource\Widgets\EmploymentTypeChart;
use Filament\Forms\Components\FileUpload;
use Illuminate\Database\Eloquent\Model;


class EmployeeResource extends Resource
{
    protected static ?string $model = Employee::class;

    protected static ?string $navigationIcon = 'heroicon-o-users';
    
    protected static ?string $navigationLabel = 'Funcionários';
    
    protected static ?string $modelLabel = 'Funcionário';
    
    protected static ?string $pluralModelLabel = 'Funcionários';
    
   protected static ?string $navigationGroup = 'Recursos Humanos';

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
                Tabs::make('Dados do Funcionário')
                    ->tabs([
                        Tabs\Tab::make('Dados Pessoais')
                            ->schema([
                                Section::make('Informações Básicas')
                                    ->schema([
                                        Forms\Components\TextInput::make('name')
                                            ->label('Nome Completo')
                                            ->required(),
                                        
                                        Forms\Components\TextInput::make('email')
                                            ->label('Email Corporativo')
                                            ->email()
                                            ->unique(ignoreRecord: true),
                                        
                                        Forms\Components\TextInput::make('employee_code')
                                            ->label('Código do Funcionário')
                                            ->unique(ignoreRecord: true)
                                            ->placeholder('Será gerado automaticamente se não preenchido')
                                            ->helperText('Deixe em branco para gerar automaticamente (ex: EMP001, EMP002, etc.)')
                                            ->maxLength(10),
                                        
                                        Forms\Components\FileUpload::make('photo_path')
                                            ->label('Foto')
                                            ->image()
                                            ->directory('employees/photos')
                                            ->visibility('private'),
                                    ])
                                    ->columns(2),
                                
                                Section::make('Acesso ao Sistema')
                                    ->schema([
                                        Forms\Components\Toggle::make('create_system_access')
                                            ->label('Criar Acesso ao Sistema')
                                            ->live()
                                            ->afterStateUpdated(function (Set $set, $state) {
                                                if (!$state) {
                                                    $set('system_email', null);
                                                    $set('system_password', null);
                                                }
                                            }),
                                
                                        Forms\Components\TextInput::make('system_email')
                                            ->label('Email de Acesso')
                                            ->email()
                                            ->visible(fn (Get $get) => $get('create_system_access')),
                                        
                                        Forms\Components\TextInput::make('system_password')
                                            ->label('Senha')
                                            ->password()
                                            ->revealable()
                                            ->visible(fn (Get $get) => $get('create_system_access'))
                                            ->suffixAction(
                                                Forms\Components\Actions\Action::make('generate_password')
                                                    ->icon('heroicon-m-arrow-path')
                                                    ->action(function (Set $set) {
                                                        $password = \Illuminate\Support\Str::random(12);
                                                        $set('system_password', $password);
                                                    })
                                                    ->tooltip('Gerar Senha Aleatória')
                                            ),
                                    ])
                                    ->visible(fn (string $operation) => $operation === 'create')
                                    ->columns(2),
                                
                                Section::make('Redefinir Acesso ao Sistema')
                                    ->schema([
                                        Forms\Components\Placeholder::make('current_access_info')
                                            ->label('Acesso Atual')
                                            ->content(fn ($record) => $record && $record->employeeUser 
                                                ? 'Email: ' . $record->employeeUser->email . ' | Status: ' . ($record->employeeUser->is_active ? 'Ativo' : 'Inativo')
                                                : 'Sem acesso ao sistema'
                                            ),
                                        
                                        Forms\Components\Toggle::make('reset_system_access')
                                            ->label('Redefinir Senha do Sistema')
                                            ->live()
                                            ->visible(fn ($record) => $record && $record->employeeUser)
                                            ->afterStateUpdated(function (Set $set, $state) {
                                                if (!$state) {
                                                    $set('new_system_password', null);
                                                }
                                            }),
                                        
                                        Forms\Components\TextInput::make('new_system_password')
                                            ->label('Nova Senha')
                                            ->password()
                                            ->revealable()
                                            ->visible(fn (Get $get, $record) => $get('reset_system_access') && $record && $record->employeeUser)
                                            ->suffixAction(
                                                Forms\Components\Actions\Action::make('generate_new_password')
                                                    ->icon('heroicon-m-arrow-path')
                                                    ->action(function (Set $set) {
                                                        $password = \Illuminate\Support\Str::password(12);
                                                        $set('new_system_password', $password);
                                                    })
                                                    ->tooltip('Gerar Nova Senha Aleatória')
                                            ),
                                        
                                        Forms\Components\Toggle::make('toggle_system_status')
                                            ->label('Ativar/Desativar Acesso')
                                            ->visible(fn ($record) => $record && $record->employeeUser)
                                            ->default(fn ($record) => $record && $record->employeeUser ? $record->employeeUser->is_active : false)
                                            ->live(),
                                    ])
                                    ->visible(fn (string $operation) => $operation === 'edit')
                                    ->columns(1),
                                
                                Section::make('Documentos')
                                    ->schema([
                                        Forms\Components\TextInput::make('nif')
                                            ->label('NIF (Número de Identificação Fiscal)')
                                            ->mask('999999999')
                                            ->required()
                                            ->unique(ignoreRecord: true)
                                            ->maxLength(9),
                                        
                                        Forms\Components\Select::make('document_type')
                                            ->label('Tipo de Documento')
                                            ->options([
                                                'cartao_cidadao' => 'Cartão de Cidadão',
                                                'titulo_residencia' => 'Título de Residência',
                                                'passaporte' => 'Passaporte',
                                                'bilhete_identidade' => 'Bilhete de Identidade',
                                                'outro' => 'Outro',
                                            ])
                                            ->required(),
                                        
                                        Forms\Components\TextInput::make('document_number')
                                            ->label('Número do Documento')
                                            ->required(),
                                        
                                        Forms\Components\TextInput::make('nis')
                                            ->label('NIS (Número de Identificação da Segurança Social)')
                                            ->mask('99999999999')
                                            ->maxLength(11)
                                            ->minLength(11)
                                            ->unique(ignoreRecord: true),
                                        
                                        Forms\Components\DatePicker::make('birth_date')
                                            ->label('Data de Nascimento'),
                                        
                                        Forms\Components\Select::make('gender')
                                            ->label('Género')
                                            ->options([
                                                'M' => 'Masculino',
                                                'F' => 'Feminino',
                                                'Other' => 'Outro',
                                            ]),
                                        
                                        Forms\Components\Select::make('marital_status')
                                            ->label('Estado Civil')
                                            ->options([
                                                'single' => 'Solteiro(a)',
                                                'married' => 'Casado(a)',
                                                'divorced' => 'Divorciado(a)',
                                                'widowed' => 'Viúvo(a)',
                                            ]),
                                    ])
                                    ->columns(3),
                                
                                Section::make('Contato')
                                    ->schema([
                                        Forms\Components\TextInput::make('phone')
                                            ->label('Telefone')
                                            ->mask('999 999 999')
                                            ->placeholder('912 345 678'),
                                        
                                        Forms\Components\TextInput::make('emergency_contact')
                                            ->label('Contato de Emergência'),
                                        
                                        Forms\Components\TextInput::make('emergency_phone')
                                            ->label('Telefone de Emergência')
                                            ->mask('999 999 999')
                                            ->placeholder('912 345 678'),
                                    ])
                                    ->columns(3),
                            ]),
                        
                        Tabs\Tab::make('Endereço')
                            ->schema([
                                Section::make('Endereço Residencial')
                                    ->schema([
                                        Forms\Components\TextInput::make('zip_code')
                                            ->label('CEP')
                                            ->mask('99999-999'),
                                        
                                        Forms\Components\TextInput::make('address')
                                            ->label('Endereço'),
                                        
                                        Forms\Components\TextInput::make('address_number')
                                            ->label('Número'),
                                        
                                        Forms\Components\TextInput::make('complement')
                                            ->label('Complemento'),
                                        
                                        Forms\Components\TextInput::make('neighborhood')
                                            ->label('Freguesia'),
                                        
                                        Forms\Components\TextInput::make('city')
                                            ->label('Cidade'),
                                        
                                        Forms\Components\TextInput::make('state')
                                            ->label('Distrito')
                                            ->maxLength(2),
                                    ])
                                    ->columns(3),
                            ]),
                        
                        Tabs\Tab::make('Dados Profissionais')
                            ->schema([
                                Section::make('Informações do Cargo')
                                    ->schema([
                                        Forms\Components\TextInput::make('position')
                                            ->label('Cargo')
                                            ->required(),
                                        
                                        Forms\Components\Select::make('department_id')
                                            ->label('Departamento')
                                            ->relationship('department', 'name')
                                            ->required(),
                                        
                                        Forms\Components\Select::make('company_id')
                                            ->label('Empresa')
                                            ->relationship('company', 'name')
                                            ->required(),
                                        
                                        Forms\Components\DatePicker::make('hire_date')
                                            ->label('Data de Admissão')
                                            ->required(),
                                        
                                        Forms\Components\DatePicker::make('termination_date')
                                            ->label('Data de Demissão'),
                                        
                                        Forms\Components\TextInput::make('salary')
                                            ->label('Salário Base')
                                            ->numeric()
                                            ->prefix('€')
                                            ->step(0.01),
                                        
                                        Forms\Components\Select::make('employment_type')
                                            ->label('Tipo de Contrato')
                                            ->options([
                                                'CLT' => 'Contrato sem Termo',
                                                'PJ' => 'Prestação de Serviços',
                                                'Intern' => 'Estagiário',
                                                'Temporary' => 'Contrato a Termo',
                                            ])
                                            ->required(),
                                        
                                        Forms\Components\Select::make('status')
                                            ->label('Status')
                                            ->options([
                                                'active' => 'Ativo',
                                                'inactive' => 'Inativo',
                                                'terminated' => 'Cessado',
                                                'on_leave' => 'Afastado',
                                            ])
                                            ->required(),
                                    ])
                                    ->columns(3),
                            ]),
                        
                        Tabs\Tab::make('Dados Bancários')
                            ->schema([
                                Section::make('Informações Bancárias')
                                    ->schema([
                                        Forms\Components\TextInput::make('bank_name')
                                            ->label('Banco'),
                                        
                                        Forms\Components\TextInput::make('bank_agency')
                                            ->label('Agência'),
                                        
                                        Forms\Components\TextInput::make('bank_account')
                                            ->label('Conta'),
                                        
                                        Forms\Components\Select::make('account_type')
                                            ->label('Tipo de Conta')
                                            ->options([
                                                'checking' => 'Conta à Ordem',
                                                'savings' => 'Conta Poupança',
                                            ]),
                                    ])
                                    ->columns(2),
                            ]),
                        
                        Tabs\Tab::make('Observações')
                            ->schema([
                                Forms\Components\Textarea::make('notes')
                                    ->label('Observações')
                                    ->rows(5),
                            ]),
                        
                        Tabs\Tab::make('Documentos')
                            ->schema([
                                Section::make('Documentos do Funcionário')
                                    ->description('Faça upload dos documentos relacionados ao funcionário (CV, contratos, certificados, etc.)')
                                    ->schema([
                                        Forms\Components\FileUpload::make('documents')
                                            ->label('Documentos')
                                            ->multiple()
                                            ->directory('employee-documents')
                                            ->acceptedFileTypes(['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
                                            ->maxSize(10240) // 10MB
                                            ->downloadable()
                                            ->previewable(false)
                                            ->reorderable()
                                            ->deletable()
                                            ->helperText('Formatos aceitos: PDF, JPG, PNG, DOC, DOCX. Tamanho máximo: 10MB por arquivo.')
                                            ->columnSpanFull(),
                                    ])
                                    ->columns(1),
                            ]),
                    ])
                    ->columnSpanFull(),
            ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->columns([
                Tables\Columns\ImageColumn::make('photo_path')
                    ->label('Foto')
                    ->square()
                    ->defaultImageUrl(fn () => 'https://ui-avatars.com/api/?name=User&background=random'),
                
                //Tables\Columns\TextColumn::make('employee_code')
                //    ->label('Código')
                //    ->searchable()
                //    ->sortable(),
                
                Tables\Columns\TextColumn::make('name')
                    ->label('Nome')
                    ->searchable()
                    ->sortable(),
                
                //Tables\Columns\TextColumn::make('nif')
                //    ->label('NIF')
                //    ->searchable(),
                
                //Tables\Columns\TextColumn::make('document_type')
                //    ->label('Tipo de Documento')
                //    ->formatStateUsing(fn (string $state): string => match ($state) {
                //        'cartao_cidadao' => 'Cartão de Cidadão',
                //        'titulo_residencia' => 'Título de Residência',
                //        'passaporte' => 'Passaporte',
                //        'bilhete_identidade' => 'Bilhete de Identidade',
                //        'outro' => 'Outro',
                //        default => $state,
                //    }),
                
                Tables\Columns\TextColumn::make('position')
                    ->label('Cargo')
                    ->searchable(),
                
                Tables\Columns\TextColumn::make('department.name')
                    ->label('Departamento')
                    ->formatStateUsing(fn ($state, $record) => $record->department?->name ?? 'Departamento não definido')
                    ->sortable(),
                
                /*Tables\Columns\TextColumn::make('employment_type')
                    ->label('Tipo')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'CLT' => 'success',
                        'PJ' => 'info',
                        'Intern' => 'warning',
                        'Temporary' => 'danger',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'CLT' => 'Sem Termo',
                        'PJ' => 'Prestação Serviços',
                        'Intern' => 'Estagiário',
                        'Temporary' => 'A Termo',
                        default => $state,
                    }),
                */
                Tables\Columns\TextColumn::make('status')
                    ->label('Status')
                    ->badge()
                    ->color(fn (string $state): string => match ($state) {
                        'active' => 'success',
                        'inactive' => 'warning',
                        'terminated' => 'danger',
                        'on_leave' => 'info',
                    })
                    ->formatStateUsing(fn (string $state): string => match ($state) {
                        'active' => 'Ativo',
                        'inactive' => 'Inativo',
                        'terminated' => 'Cessado',
                        'on_leave' => 'Afastado',
                        default => $state,
                    }),
                
                Tables\Columns\TextColumn::make('hire_date')
                    ->label('Admissão')
                    ->date('d/m/Y')
                    ->sortable(),
                ])
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'active' => 'Ativo',
                        'inactive' => 'Inativo',
                        'terminated' => 'Cessado',
                        'on_leave' => 'Afastado',
                    ]),
                
                SelectFilter::make('department_id')
                    ->label('Departamento')
                    ->relationship('department', 'name'),
                
                SelectFilter::make('employment_type')
                    ->label('Tipo de Contrato')
                    ->options([
                        'CLT' => 'Sem Termo',
                        'PJ' => 'Prestação de Serviços',
                        'Intern' => 'Estagiário',
                        'Temporary' => 'A Termo',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                
                Tables\Actions\Action::make('reset_password')
                    ->label('Redefinir Senha')
                    ->icon('heroicon-m-key')
                    ->color('warning')
                    ->visible(fn ($record) => $record->employeeUser !== null)
                    ->form([
                        Forms\Components\TextInput::make('new_password')
                            ->label('Nova Senha')
                            ->password()
                            ->revealable()
                            ->required()
                            ->suffixAction(
                                Forms\Components\Actions\Action::make('generate')
                                    ->icon('heroicon-m-arrow-path')
                                    ->action(function (Set $set) {
                                        $password = \Illuminate\Support\Str::password(12);
                                        $set('new_password', $password);
                                    })
                                    ->tooltip('Gerar Senha Aleatória')
                            ),
                    ])
                    ->action(function ($record, array $data) {
                        // Verificar se o funcionário tem acesso ao sistema
                        if (!$record->employeeUser) {
                            \Filament\Notifications\Notification::make()
                                ->title('Erro!')
                                ->body('Este funcionário não possui acesso ao sistema.')
                                ->danger()
                                ->send();
                            return;
                        }
                        
                        // Atualizar a senha na tabela employee_users
                        $record->employeeUser->update([
                            'password' => bcrypt($data['new_password'])
                        ]);
                        
                        \Filament\Notifications\Notification::make()
                            ->title('Senha redefinida com sucesso!')
                            ->body('Nova senha: ' . $data['new_password'])
                            ->success()
                            ->persistent()
                            ->send();
                    }),
            ])
                
               /* Tables\Columns\IconColumn::make('has_documents')
                    ->label('Documentos')
                    ->boolean()
                    ->getStateUsing(fn ($record) => !empty($record->documents))
                    ->trueIcon('heroicon-o-document-text')
                    ->falseIcon('heroicon-o-document')
                    ->trueColor('success')
                    ->falseColor('gray'),
                
                Tables\Columns\TextColumn::make('salary')
                    ->label('Salário Base')
                    ->money('EUR')
                    ->sortable(),
                */
            ->filters([
                SelectFilter::make('status')
                    ->label('Status')
                    ->options([
                        'active' => 'Ativo',
                        'inactive' => 'Inativo',
                        'terminated' => 'Cessado',
                        'on_leave' => 'Afastado',
                    ]),
                
                SelectFilter::make('department_id')
                    ->label('Departamento')
                    ->relationship('department', 'name'),
                
                SelectFilter::make('employment_type')
                    ->label('Tipo de Contrato')
                    ->options([
                        'CLT' => 'Sem Termo',
                        'PJ' => 'Prestação de Serviços',
                        'Intern' => 'Estagiário',
                        'Temporary' => 'A Termo',
                    ]),
            ])
            ->actions([
                Tables\Actions\ViewAction::make(),
                Tables\Actions\EditAction::make(),
                
            ])
            ->bulkActions([
                Tables\Actions\BulkActionGroup::make([
                    Tables\Actions\DeleteBulkAction::make(),
                ]),
            ])
            ->defaultSort('hire_date', 'desc');
    }

    public static function getRelations(): array
    {
        return [
            //
        ];
    }

    public static function getWidgets(): array
    {
        return [
            EmployeeStatsOverview::class,
            EmployeeStatusWidget::class,
            BirthdayWidget::class,
            NewHiresWidget::class,
            EmployeesByDepartmentChart::class,
            EmploymentTypeChart::class,
        ];
    }
    
    public static function getPages(): array
    {
        return [
            'index' => Pages\ListEmployees::route('/'),
            'create' => Pages\CreateEmployee::route('/create'),
            'view' => Pages\ViewEmployee::route('/{record}'),
            'edit' => Pages\EditEmployee::route('/{record}/edit'),
        ];
    }

    public static function canAccess(): bool
    {
        return auth()->user()->can('viewAny', Employee::class);
    }

    public static function canViewAny(): bool
    {
        return auth()->user()->can('viewAny', Employee::class);
    }

    public static function canCreate(): bool
    {
        return auth()->user()->can('create', Employee::class);
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
        return auth()->user()->can('viewAny', Employee::class);
    }

}
