<?php
namespace Modules\Finance\Filament\Resources;
use Modules\Finance\Filament\Resources\FinanceCostCenterResource\Pages;
use Modules\Finance\Models\FinanceCostCenter;
use Filament\Forms;
use Filament\Forms\Form;
use Filament\Resources\Resource;
use Filament\Tables;
use Filament\Tables\Table;

class FinanceCostCenterResource extends Resource
{
    protected static ?string $model = FinanceCostCenter::class;
    protected static ?string $navigationIcon = 'heroicon-o-building-office';
    protected static ?string $navigationGroup = 'Financeiro';
    protected static ?string $navigationLabel = 'Centros de Custo';

    public static function shouldRegisterNavigation(): bool
    {
        $user = auth()->user();

        if (! $user) {
            return false;
        }

        // Administradores podem ver todos os recursos
        if ($user->isAdmin()) {
            return true;
        }

        // Gestores Financeiros podem ver recursos Financeiros
        if ($user->isManager() &&
            $user->department &&
            strtolower($user->department->name) === 'financeiro') {
            return true;
        }

        return false;
    }

    public static function form(Form $form): Form
    {
        return $form->schema([
            Forms\Components\TextInput::make('name')->label('Nome')->required()->maxLength(255),
            Forms\Components\TextInput::make('code')->label('Código')->maxLength(255),
        ]);
    }

    public static function table(Table $table): Table
    {
        return $table->columns([
            Tables\Columns\TextColumn::make('name')->label('Nome')->searchable(),
            Tables\Columns\TextColumn::make('code')->label('Código')->searchable(),
        ])
        ->actions([Tables\Actions\EditAction::make()])
        ->bulkActions([Tables\Actions\DeleteBulkAction::make()]);
    }

    public static function getPages(): array
    {
        return [
            'index' => Pages\ListFinanceCostCenters::route('/'),
            'create' => Pages\CreateFinanceCostCenter::route('/create'),
            'edit' => Pages\EditFinanceCostCenter::route('/{record}/edit'),
        ];
    }
}