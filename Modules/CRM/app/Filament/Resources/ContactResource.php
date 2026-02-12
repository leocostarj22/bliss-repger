<?php

namespace Modules\CRM\Filament\Resources;

use Modules\CRM\Models\Contact;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;
use Modules\CRM\Filament\Resources\ContactResource\Pages;
use App\Models\Company;

class ContactResource extends Resource
{
    protected static ?string $model = Contact::class;
    protected static ?string $navigationIcon = 'heroicon-o-user';
    protected static ?string $navigationLabel = 'Contatos';
    protected static ?string $navigationGroup = 'CRM';
    protected static ?int $navigationSort = 2;
    protected static bool $shouldRegisterNavigation = false;

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\Section::make('Dados')
                ->schema([
                    Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
                    Forms\Components\TextInput::make('email')->label('Email')->email()->maxLength(255),
                    Forms\Components\TextInput::make('phone')->label('Telefone')->maxLength(255),
                    Forms\Components\Select::make('company_id')
                        ->label('Empresa')
                        ->options(Company::query()->select(['id', 'name'])->pluck('name', 'id'))
                        ->searchable()
                        ->preload(),
                    Forms\Components\Select::make('source')->label('Origem')->options([
                        'gocontact' => 'GoContact',
                        'website' => 'Website',
                        'referral' => 'Indicação',
                        'social_media' => 'Redes Sociais',
                        'email_marketing' => 'Email Marketing',
                        'cold_call' => 'Cold Call',
                        'event' => 'Evento',
                        'other' => 'Outro',
                    ]),
                    Forms\Components\Select::make('status')->label('Status')->options([
                        'prospect' => 'Prospect',
                        'customer' => 'Cliente',
                        'inactive' => 'Inativo',
                    ])->default('prospect'),
                ])->columns(2),
            Forms\Components\Section::make('UTM')
                ->schema([
                    Forms\Components\TextInput::make('utm_source')->label('utm_source')->maxLength(255),
                    Forms\Components\TextInput::make('utm_medium')->label('utm_medium')->maxLength(255),
                    Forms\Components\TextInput::make('utm_campaign')->label('utm_campaign')->maxLength(255),
                    Forms\Components\TextInput::make('utm_content')->label('utm_content')->maxLength(255),
                    Forms\Components\TextInput::make('utm_term')->label('utm_term')->maxLength(255),
                ])->columns(3),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (\Illuminate\Database\Eloquent\Builder $query) => $query->with('company'))
            ->columns([
                Tables\Columns\TextColumn::make('name')->label('Nome')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('email')->label('Email')->searchable()->sortable(),
                Tables\Columns\TextColumn::make('phone')->label('Telefone'),
                Tables\Columns\TextColumn::make('company.name')->label('Empresa')->sortable(),
                Tables\Columns\TextColumn::make('source')->label('Origem'),
                Tables\Columns\TextColumn::make('status')->label('Status')->sortable(),
                Tables\Columns\TextColumn::make('created_at')->label('Criado em')->dateTime('d/m/Y H:i')->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                Tables\Filters\SelectFilter::make('company_id')->label('Empresa')->options(Company::pluck('name', 'id')),
                Tables\Filters\SelectFilter::make('source')->label('Origem')->options([
                    'gocontact' => 'GoContact',
                    'website' => 'Website',
                    'referral' => 'Indicação',
                    'social_media' => 'Redes Sociais',
                    'email_marketing' => 'Email Marketing',
                    'cold_call' => 'Cold Call',
                    'event' => 'Evento',
                    'other' => 'Outro',
                ]),
                Tables\Filters\SelectFilter::make('status')->label('Status')->options([
                    'prospect' => 'Prospect',
                    'customer' => 'Cliente',
                    'inactive' => 'Inativo',
                ]),
                Tables\Filters\TrashedFilter::make(),
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
            ->defaultSort('created_at', 'desc');
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListContacts::route('/'),
            'create' => Pages\CreateContact::route('/create'),
            'view' => Pages\ViewContact::route('/{record}'),
            'edit' => Pages\EditContact::route('/{record}/edit'),
        ];
    }
}