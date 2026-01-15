<?php
namespace Modules\Finance\Filament\Resources;
use Modules\Finance\Filament\Resources\FinanceTransactionResource\Pages;
use Modules\Finance\Models\FinanceTransaction;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class FinanceTransactionResource extends Resource
{
    protected static ?string $model = FinanceTransaction::class;
    protected static ?string $navigationIcon = 'heroicon-o-currency-euro';
    protected static ?string $navigationGroup = 'Financeiro';
    protected static ?string $navigationLabel = 'Lançamentos';

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('description')->label('Descrição')->required()->maxLength(255)->columnSpanFull(),
            Forms\Components\Select::make('type')->label('Tipo')->options(['income' => 'Receita', 'expense' => 'Despesa'])->required()->reactive(),
            Forms\Components\TextInput::make('amount')->label('Valor')->numeric()->prefix('€')->required(),
            Forms\Components\DatePicker::make('due_date')->label('Vencimento')->required(),
            Forms\Components\Select::make('category_id')->label('Categoria')->relationship('category', 'name')->required()->searchable()->preload(),
            Forms\Components\Select::make('cost_center_id')->label('Centro de Custo')->relationship('costCenter', 'name')->searchable()->preload(),
            Forms\Components\Section::make('Pagamento')->schema([
                Forms\Components\Select::make('status')->label('Estado')->options(['pending' => 'Pendente', 'paid' => 'Pago', 'late' => 'Atrasado', 'cancelled' => 'Cancelado'])->default('pending')->reactive(),
                Forms\Components\DatePicker::make('paid_at')->label('Data Pagamento')->visible(fn (Forms\Get $get) => $get('status') === 'paid'),
                Forms\Components\Select::make('bank_account_id')->label('Conta Bancária')->relationship('bankAccount', 'name')->visible(fn (Forms\Get $get) => $get('status') === 'paid')->searchable()->preload(),
            ])->columns(3),
            Forms\Components\Textarea::make('notes')->label('Notas')->columnSpanFull(),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\TextColumn::make('due_date')->label('Vencimento')->date()->sortable(),
            Tables\Columns\TextColumn::make('description')->label('Descrição')->searchable(),
            Tables\Columns\TextColumn::make('category.name')->label('Categoria')->sortable(),
            Tables\Columns\TextColumn::make('amount')->label('Valor')->money('EUR')->sortable(),
            Tables\Columns\TextColumn::make('type')->label('Tipo')->badge()->colors(['success' => 'income', 'danger' => 'expense']),
            Tables\Columns\TextColumn::make('status')->label('Estado')->badge()->colors(['warning' => 'pending', 'success' => 'paid', 'danger' => 'late', 'gray' => 'cancelled']),
        ])
        ->filters([
            Tables\Filters\SelectFilter::make('type')->options(['income' => 'Receita', 'expense' => 'Despesa']),
            Tables\Filters\SelectFilter::make('status')->options(['pending' => 'Pendente', 'paid' => 'Pago', 'late' => 'Atrasado', 'cancelled' => 'Cancelado']),
        ])
        ->actions([Tables\Actions\EditAction::make()])
        ->bulkActions([Tables\Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFinanceTransactions::route('/'),
            'create' => Pages\CreateFinanceTransaction::route('/create'),
            'edit' => Pages\EditFinanceTransaction::route('/{record}/edit'),
        ];
    }
}