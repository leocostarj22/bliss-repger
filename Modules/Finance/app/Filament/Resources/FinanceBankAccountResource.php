<?php
namespace Modules\Finance\Filament\Resources;
use Modules\Finance\Filament\Resources\FinanceBankAccountResource\Pages;
use Modules\Finance\Models\FinanceBankAccount;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class FinanceBankAccountResource extends Resource
{
    protected static ?string $model = FinanceBankAccount::class;
    protected static ?string $navigationIcon = 'heroicon-o-credit-card';
    protected static ?string $navigationGroup = 'Financeiro';
    protected static ?string $navigationLabel = 'Contas Bancárias';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome Interno')->required()->maxLength(255),
            Forms\Components\TextInput::make('bank_name')->label('Banco')->maxLength(255),
            Forms\Components\TextInput::make('account_number')->label('IBAN / Nº Conta')->maxLength(255),
            Forms\Components\TextInput::make('currency')->label('Moeda')->default('EUR')->required(),
            Forms\Components\TextInput::make('initial_balance')->label('Saldo Inicial')->numeric()->default(0),
            Forms\Components\Toggle::make('is_active')->label('Ativa')->default(true),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\TextColumn::make('name')->label('Nome')->searchable(),
            Tables\Columns\TextColumn::make('bank_name')->label('Banco'),
            Tables\Columns\TextColumn::make('current_balance')->label('Saldo Atual')->money('EUR'),
            Tables\Columns\IconColumn::make('is_active')->boolean(),
        ])
        ->actions([Tables\Actions\EditAction::make()])
        ->bulkActions([Tables\Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFinanceBankAccounts::route('/'),
            'create' => Pages\CreateFinanceBankAccount::route('/create'),
            'edit' => Pages\EditFinanceBankAccount::route('/{record}/edit'),
        ];
    }
}